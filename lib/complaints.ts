import "server-only";
import type { Types } from "mongoose";
import { type Auth, forbidden, notFound, requireCollegeRole, toId } from "./api";
import { Complaint, Course, Section, Student } from "./models";

export const COMPLAINT_STAFF = ["registrar", "college_admin", "dean", "department_head", "instructor"] as const;

/** Mongo filter for the complaints this staff member may see. */
export async function staffComplaintScope(auth: Auth, college: Types.ObjectId) {
  if (auth.has("registrar", "college_admin")) return { college };
  const or: Record<string, unknown>[] = [];
  if (auth.has("dean", "department_head")) {
    if (!auth.departmentIds.length) return { college };
    or.push({ course: { $in: await Course.find({ college, department: { $in: auth.departmentIds } }).distinct("_id") } });
  }
  if (auth.has("instructor")) {
    or.push({ section: { $in: await Section.find({ college, instructor: auth.userId }).distinct("_id") } });
  }
  if (!or.length) throw forbidden();
  return { college, $or: or };
}

/** Loads one complaint the caller may see, and says whether they are its student or staff. */
export async function loadComplaint(auth: Auth, id: string) {
  const college = requireCollegeRole(auth, "student", ...COMPLAINT_STAFF);
  const _id = toId(id, "Complaint");
  if (auth.has(...COMPLAINT_STAFF)) {
    const complaint = await Complaint.findOne({ _id, ...(await staffComplaintScope(auth, college)) });
    if (complaint) return { complaint, asStudent: false, canDecide: auth.has("registrar", "college_admin") };
  }
  const student = await Student.findOne({ user: auth.userId, college }).select("_id").lean();
  const complaint = student ? await Complaint.findOne({ _id, student: student._id }) : null;
  if (!complaint) throw notFound("Complaint");
  return { complaint, asStudent: true, canDecide: false };
}
