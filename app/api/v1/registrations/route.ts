import { z } from "zod";
import { audit, badRequest, getAuth, getOwnStudent, handler, json, parseBody, requireCollegeRole, requireModule, zs } from "@/lib/api";
import { Course, Registration, Section, Semester } from "@/lib/models";
import { checkEligibility, registrationContext, seatsTaken } from "@/lib/registration";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const params = req.nextUrl.searchParams;
  const query: Record<string, unknown> = {};
  if (auth.has("registrar", "college_admin", "dean", "department_head")) {
    query.college = requireCollegeRole(auth);
    if (!auth.has("registrar", "college_admin") && auth.departmentIds.length) {
      query.course = { $in: await Course.find({ college: auth.collegeId!, department: { $in: auth.departmentIds } }).distinct("_id") };
    }
    const student = params.get("student");
    if (student) query.student = student;
  } else {
    const student = await getOwnStudent(auth);
    query.student = student._id;
    query.college = student.college;
  }
  for (const key of ["status", "semester", "section"]) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  const items = await Registration.find(query)
    .populate("student", "studentId firstName lastName")
    .populate("course", "code title credits")
    .populate("semester", "name academicYear registrationOpen")
    .populate({ path: "section", select: "name schedule instructor", populate: { path: "instructor", select: "name" } })
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  return json({ items });
});

const schema = z.object({ sections: z.array(zs.id).min(1).max(12) });

/** Student submits a registration cart. Each section is checked and saved as pending approval. */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  requireModule(auth, "registration");
  const student = await getOwnStudent(auth);
  const { sections: ids } = await parseBody(req, schema);
  const sections = await Section.find({ _id: { $in: ids }, college: student.college })
    .populate("course", "code title credits prerequisites")
    .lean();
  if (sections.length !== new Set(ids).size) throw badRequest("One or more sections were not found.");

  const results: { section: string; course: string; ok: boolean; reason?: string }[] = [];
  const contexts = new Map<string, Awaited<ReturnType<typeof registrationContext>>>();
  const taken = await seatsTaken(sections.map((s) => s._id));
  for (const section of sections) {
    const course = section.course as unknown as { _id: unknown; code: string; credits: number };
    const semester = await Semester.findById(section.semester).lean();
    if (!semester?.registrationOpen) {
      results.push({ section: String(section._id), course: course.code, ok: false, reason: "Registration is closed for this semester." });
      continue;
    }
    const key = String(semester._id);
    if (!contexts.has(key)) contexts.set(key, await registrationContext(student, semester._id));
    const ctx = contexts.get(key)!;
    const reason = await checkEligibility(ctx, section as never, taken.get(String(section._id)) ?? 0);
    if (reason) {
      results.push({ section: String(section._id), course: course.code, ok: false, reason });
      continue;
    }
    // A previously dropped or rejected row for the same section is reopened instead of duplicated.
    await Registration.findOneAndUpdate(
      { student: student._id, section: section._id },
      {
        $set: { college: student.college, course: course._id, semester: semester._id, status: "pending" },
        $unset: { note: 1, decidedBy: 1, decidedAt: 1 },
      },
      { upsert: true },
    );
    ctx.current.push({ _id: section._id, schedule: section.schedule as never, course: course as never });
    results.push({ section: String(section._id), course: course.code, ok: true });
  }
  await audit(auth, "register_courses", "Registration", student._id, { results });
  return json({ results });
});
