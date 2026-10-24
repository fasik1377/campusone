import { z } from "zod";
import { audit, badRequest, forbidden, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { Course, GradeEntry, Registration, Section, Semester, Student } from "@/lib/models";

type P = { id: string };

const schema = z.object({ action: z.enum(["approve", "reject"]), note: zs.str(500) });

/** Registrar or the course's department head approves or rejects a pending registration. */
export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "department_head");
  const reg = await Registration.findOne({ _id: toId((await params).id, "Registration"), college });
  if (!reg) throw notFound("Registration");
  if (!auth.has("registrar") && auth.departmentIds.length) {
    const course = await Course.findById(reg.course).select("department").lean();
    if (!auth.departmentIds.some((d) => String(d) === String(course?.department))) throw forbidden("This course is outside your department.");
  }
  const { action, note } = await parseBody(req, schema);
  if (reg.status !== "pending") throw badRequest(`This registration is already ${reg.status}.`);
  if (action === "reject" && !note) throw badRequest("Please give the student a reason for the rejection.");
  if (action === "approve") {
    const section = await Section.findById(reg.section).select("capacity").lean();
    const approved = await Registration.countDocuments({ section: reg.section, status: "approved" });
    if (section && approved >= section.capacity) throw badRequest("The section is already at capacity.");
  }
  reg.status = action === "approve" ? "approved" : "rejected";
  reg.note = note;
  reg.decidedBy = auth.user.name;
  reg.decidedAt = new Date();
  await reg.save();
  await audit(auth, `registration_${reg.status}`, "Registration", reg._id, { note });
  return json({ item: reg });
});

/** Drop a course: students during open registration, the registrar at any time before results are published. */
export const DELETE = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "student", "registrar");
  const reg = await Registration.findOne({ _id: toId((await params).id, "Registration"), college });
  if (!reg) throw notFound("Registration");
  if (!auth.has("registrar")) {
    const student = await Student.findOne({ user: auth.userId, college }).select("_id").lean();
    if (!student || String(student._id) !== String(reg.student)) throw forbidden();
    const semester = await Semester.findById(reg.semester).select("registrationOpen").lean();
    if (!semester?.registrationOpen) throw badRequest("The add/drop period for this semester is closed.");
  }
  if (reg.status === "dropped" || reg.status === "rejected") throw badRequest(`This registration is already ${reg.status}.`);
  if (await GradeEntry.exists({ section: reg.section, student: reg.student, published: true })) {
    throw badRequest("A published grade exists for this course; it can no longer be dropped.");
  }
  reg.status = "dropped";
  reg.decidedBy = auth.user.name;
  reg.decidedAt = new Date();
  await reg.save();
  await audit(auth, "registration_dropped", "Registration", reg._id);
  return json({ ok: true });
});
