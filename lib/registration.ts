import "server-only";
import type { Types } from "mongoose";
import { College, Course, GradeEntry, Invoice, Registration, Section } from "./models";

type Slot = { day: string; start: string; end: string };
const overlaps = (a: Slot, b: Slot) => a.day === b.day && a.start < b.end && b.start < a.end;

type SectionLike = {
  _id: Types.ObjectId;
  course: { _id: Types.ObjectId; code: string; credits: number; prerequisites?: Types.ObjectId[] };
  semester: Types.ObjectId | { _id: Types.ObjectId };
  schedule?: Slot[];
  capacity: number;
};

/** Loads everything needed to evaluate a student's registration requests for one semester. */
export async function registrationContext(student: { _id: Types.ObjectId; college: Types.ObjectId; status: string }, semesterId: Types.ObjectId) {
  const [college, passed, current, overdue] = await Promise.all([
    College.findById(student.college).select("maxCreditsPerSemester requireFeeClearance").lean(),
    GradeEntry.find({ student: student._id, published: true, letter: { $ne: "F" } }).distinct("course"),
    Registration.find({ student: student._id, semester: semesterId, status: { $in: ["pending", "approved"] } })
      .populate({ path: "section", select: "schedule course", populate: { path: "course", select: "code credits" } })
      .lean(),
    Invoice.exists({ student: student._id, status: { $in: ["unpaid", "partial"] }, dueDate: { $lt: new Date() } }),
  ]);
  return {
    student,
    maxCredits: college?.maxCreditsPerSemester ?? 24,
    feeBlocked: !!(college?.requireFeeClearance && overdue),
    passed: new Set(passed.map(String)),
    current: current.map((r) => r.section as unknown as { _id: Types.ObjectId; schedule: Slot[]; course: { _id: Types.ObjectId; code: string; credits: number } }),
  };
}

export type RegistrationContext = Awaited<ReturnType<typeof registrationContext>>;

/** Returns the reason a section cannot be taken, or null when eligible. Mutates ctx.current on success when `commit` is set. */
export async function checkEligibility(ctx: RegistrationContext, section: SectionLike, seatsTaken: number) {
  if (ctx.student.status !== "active") return "Only active students can register.";
  if (ctx.feeBlocked) return "You have overdue fees. Please clear them with the finance office first.";
  if (ctx.current.some((s) => String(s._id) === String(section._id))) return "Already registered for this section.";
  if (ctx.current.some((s) => String(s.course?._id) === String(section.course._id))) return `Already registered for ${section.course.code} in another section.`;
  if (ctx.passed.has(String(section.course._id))) return `You have already passed ${section.course.code}.`;
  const prereqs = section.course.prerequisites ?? [];
  const missing = prereqs.filter((p) => !ctx.passed.has(String(p)));
  if (missing.length) {
    const codes = await Course.find({ _id: { $in: missing } }).distinct("code");
    return `Prerequisite not completed: ${codes.join(", ")}.`;
  }
  if (seatsTaken >= section.capacity) return "This section is full.";
  const credits = ctx.current.reduce((s, c) => s + (c.course?.credits ?? 0), 0) + section.course.credits;
  if (credits > ctx.maxCredits) return `Credit limit exceeded (${credits} of ${ctx.maxCredits} allowed).`;
  for (const other of ctx.current) {
    for (const a of section.schedule ?? []) {
      for (const b of other.schedule ?? []) {
        if (overlaps(a, b)) return `Timetable conflict with ${other.course?.code} on ${a.day} ${b.start}-${b.end}.`;
      }
    }
  }
  return null;
}

export async function seatsTaken(sectionIds: Types.ObjectId[]) {
  const rows = await Registration.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { section: { $in: sectionIds }, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: "$section", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function openSections(college: Types.ObjectId, semesterId: Types.ObjectId) {
  return Section.find({ college, semester: semesterId })
    .populate("course", "code title credits prerequisites department")
    .populate("instructor", "name")
    .lean();
}
