import "server-only";
import type { Types } from "mongoose";
import { type Auth, forbidden, notFound, requireCollegeRole, toId } from "./api";
import { College, Registration, Section } from "./models";
import type { GradeBand } from "./roles";

type CourseRef = { _id: unknown; code: string; title: string; credits: number; department: unknown };
type SemesterRef = { _id: unknown; name: string; academicYear: string };

/**
 * Loads a section the caller may see. Instructors only reach their own sections; with `write`
 * nobody but the assigned instructor may change attendance or marks.
 */
export async function loadSection(auth: Auth, id: string, { write = false } = {}) {
  const college = requireCollegeRole(auth, "instructor", "registrar", "college_admin", "dean", "department_head");
  const section = await Section.findOne({ _id: toId(id, "Section"), college })
    .populate("course", "code title credits department")
    .populate("semester", "name academicYear")
    .populate("instructor", "name");
  if (!section) throw notFound("Section");
  const course = section.course as unknown as CourseRef;
  const isInstructor = String((section.instructor as unknown as { _id: unknown })?._id) === String(auth.userId);
  const inDepartment = !auth.departmentIds.length || auth.departmentIds.some((d) => String(d) === String(course.department));
  const leadership = auth.has("registrar", "college_admin") || (auth.has("dean", "department_head") && inDepartment);
  if (write ? !isInstructor : !isInstructor && !leadership) throw forbidden("You are not assigned to this section.");
  return { section, college, course, semester: section.semester as unknown as SemesterRef, isInstructor, inDepartment };
}

export async function rosterFor(sectionId: Types.ObjectId) {
  const regs = await Registration.find({ section: sectionId, status: "approved" })
    .populate("student", "studentId firstName lastName email status")
    .lean();
  return regs
    .map((r) => r.student as unknown as { _id: Types.ObjectId; studentId: string; firstName: string; lastName: string; email?: string; status: string })
    .filter(Boolean)
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function gradingScaleFor(college: unknown) {
  const c = await College.findById(college).select("gradingScale").lean();
  return (c?.gradingScale ?? []) as GradeBand[];
}
