import type { Types } from "mongoose";
import { z } from "zod";
import { audit, badRequest, getAuth, getOwnStudent, handler, json, parseBody, requireCollegeRole, zs } from "@/lib/api";
import { COMPLAINT_STAFF, staffComplaintScope } from "@/lib/complaints";
import { College, Complaint, GradeEntry, nextSequence } from "@/lib/models";
import { COMPLAINT_CATEGORIES } from "@/lib/roles";

const LIST_FIELDS = "ticketNumber category subject status createdAt updatedAt studentUnread staffUnread student course gradeEntry resolution";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const params = req.nextUrl.searchParams;
  let query: Record<string, unknown>;
  if (auth.has(...COMPLAINT_STAFF)) {
    query = await staffComplaintScope(auth, requireCollegeRole(auth));
    const status = params.get("status");
    if (status === "open") query.status = { $in: ["submitted", "under_review"] };
    else if (status) query.status = status;
    const category = params.get("category");
    if (category) query.category = category;
  } else {
    query = { student: (await getOwnStudent(auth))._id };
  }
  const items = await Complaint.find(query)
    .select(LIST_FIELDS)
    .populate("student", "studentId firstName lastName")
    .populate("course", "code title")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();
  return json({ items });
});

const schema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  subject: zs.req(150),
  description: zs.req(3000),
  gradeEntry: zs.optId,
});

/** A student files a complaint; grade appeals point at one of their own published grades. */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const student = await getOwnStudent(auth);
  const data = await parseBody(req, schema);

  let link: { gradeEntry?: Types.ObjectId; course?: Types.ObjectId; section?: Types.ObjectId } = {};
  if (data.gradeEntry) {
    const entry = await GradeEntry.findOne({ _id: data.gradeEntry, student: student._id, published: true }).select("course section").lean();
    if (!entry) throw badRequest("That grade was not found among your published results.");
    if (await Complaint.exists({ gradeEntry: entry._id, status: { $in: ["submitted", "under_review"] } })) {
      throw badRequest("You already have an open appeal for this grade. Add a message to it instead.");
    }
    link = { gradeEntry: entry._id, course: entry.course, section: entry.section };
  } else if (data.category === "grade") {
    throw badRequest("Choose which grade your appeal is about.");
  }
  const openCount = await Complaint.countDocuments({ student: student._id, status: { $in: ["submitted", "under_review"] } });
  if (openCount >= 10) throw badRequest("You have 10 open complaints. Please wait for some to be resolved.");

  const { code } = (await College.findById(student.college).select("code").lean())!;
  const seq = await nextSequence(`complaint:${student.college}`);
  const complaint = await Complaint.create({
    college: student.college,
    student: student._id,
    ticketNumber: `CMP-${code}-${String(seq).padStart(5, "0")}`,
    category: data.category,
    subject: data.subject,
    ...link,
    messages: [{ by: auth.userId, byName: auth.user.name, fromStudent: true, body: data.description }],
    staffUnread: true,
  });
  await audit(auth, "submit_complaint", "Complaint", complaint._id, { ticket: complaint.ticketNumber, category: data.category });
  return json({ item: complaint }, 201);
});
