import type { NextRequest } from "next/server";
import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { hashPassword, standingFor, temporaryPassword, transcriptFor } from "@/lib/academics";
import { Invoice, Program, Registration, Student, User } from "@/lib/models";
import { STUDENT_STATUSES, type Role } from "@/lib/roles";

type P = { id: string };

async function load(req: NextRequest, id: string, roles: Role[]) {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, ...roles);
  const query: Record<string, unknown> = { _id: toId(id, "Student"), college };
  if (!auth.has("registrar", "college_admin") && auth.departmentIds.length) query.department = { $in: auth.departmentIds };
  return { auth, college, query };
}

export const GET = handler<P>(async (req, { params }) => {
  const { query } = await load(req, (await params).id, ["registrar", "college_admin", "dean", "department_head"]);
  const student = await Student.findOne(query)
    .populate("program", "name code totalCredits minGpa")
    .populate("department", "name code")
    .populate("user", "username status lastLoginAt")
    .lean();
  if (!student) throw notFound("Student");
  const [transcript, registrations, invoices] = await Promise.all([
    transcriptFor(student._id),
    Registration.find({ student: student._id })
      .populate("course", "code title credits")
      .populate("semester", "name academicYear")
      .populate({ path: "section", select: "name" })
      .sort({ createdAt: -1 })
      .lean(),
    Invoice.find({ student: student._id }).select("invoiceNumber description amount paidAmount currency status dueDate").sort({ createdAt: -1 }).lean(),
  ]);
  return json({ item: student, transcript: { ...transcript, standing: standingFor(transcript.cgpa, transcript.creditsAttempted) }, registrations, invoices });
});

const schema = z.object({
  firstName: zs.req(80).optional(),
  lastName: zs.req(80).optional(),
  email: zs.email,
  phone: zs.str(30),
  gender: zs.str(20),
  dateOfBirth: zs.date,
  address: zs.str(300),
  emergencyContactName: zs.str(120),
  emergencyContactPhone: zs.str(30),
  cohort: zs.str(20),
  studyMode: zs.str(30),
  program: zs.optId,
  status: z.enum(STUDENT_STATUSES).optional(),
  reason: zs.str(500),
  resetPassword: z.boolean().optional(),
});

export const PATCH = handler<P>(async (req, { params }) => {
  const { auth, college, query } = await load(req, (await params).id, ["registrar"]);
  const student = await Student.findOne(query);
  if (!student) throw notFound("Student");
  const { status, reason, program, resetPassword, ...profile } = await parseBody(req, schema);

  student.set(profile);
  if (program && String(program) !== String(student.program)) {
    const target = await Program.findOne({ _id: program, college }).lean();
    if (!target) throw badRequest("Program not found in this college.");
    if (!reason) throw badRequest("A reason is required for a program transfer.");
    student.program = target._id;
    student.department = target.department;
    student.statusHistory.push({ status: `transferred to ${target.code}`, reason, by: auth.user.name, at: new Date() });
  }
  if (status && status !== student.status) {
    if (!reason) throw badRequest("A reason is required to change a student's status.");
    student.status = status;
    student.statusHistory.push({ status, reason, by: auth.user.name, at: new Date() });
  }
  await student.save();

  let temporary: string | undefined;
  if (student.user) {
    const user = await User.findById(student.user);
    if (user) {
      user.name = `${student.firstName} ${student.lastName}`;
      if (profile.email !== undefined && profile.email !== user.email) {
        if (profile.email && (await User.exists({ email: profile.email, _id: { $ne: user._id } }))) throw badRequest("That email is already registered.");
        user.email = profile.email;
      }
      // Withdrawn or graduated students keep their records but alumni access is read-only via status.
      if (resetPassword) {
        temporary = temporaryPassword();
        user.passwordHash = await hashPassword(temporary);
        user.mustChangePassword = true;
      }
      await user.save();
    }
  }
  await audit(auth, resetPassword ? "reset_student_password" : "update_student", "Student", student._id, { status, reason, program, ...profile });
  return json({ item: student, temporaryPassword: temporary });
});
