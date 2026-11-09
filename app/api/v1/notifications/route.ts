import { getAuth, handler, json } from "@/lib/api";
import { staffComplaintScope } from "@/lib/complaints";
import { Application, College, Complaint, Course, Invoice, Registration, Section, ServiceRequest, Student, User } from "@/lib/models";

type Note = { label: string; count: number; href: string; tone: "info" | "warning" | "danger" };

/** Things waiting on the signed-in person, by role. Only non-zero items are returned. */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const notes: Note[] = [];
  const add = (label: string, count: number, href: string, tone: Note["tone"] = "info") => count > 0 && notes.push({ label, count, href, tone });
  const college = auth.collegeId;

  if (auth.isSuperAdmin) {
    add("Colleges waiting for activation", await College.countDocuments({ status: "pending_setup" }), "/portal/colleges", "warning");
    add("Accounts still on an admin-set password", await User.countDocuments({ status: "active", mustChangePassword: true }), "/portal/users");
  }

  if (college && !auth.collegeBlocked) {
    if (auth.has("registrar", "college_admin", "dean", "department_head", "instructor")) {
      const scope = await staffComplaintScope(auth, college).catch(() => null);
      if (scope) add("Complaints with new messages", await Complaint.countDocuments({ ...scope, staffUnread: true, status: { $in: ["submitted", "under_review"] } }), "/portal/complaints", "warning");
    }
    if (auth.has("registrar", "admissions_officer")) {
      add("Applications to review", await Application.countDocuments({ college, status: { $in: ["submitted", "under_review"] } }), "/portal/applications");
    }
    if (auth.has("registrar")) {
      add("Registrations awaiting approval", await Registration.countDocuments({ college, status: "pending" }), "/portal/registrations");
      add("Grade sheets ready to publish", await Section.countDocuments({ college, gradeStatus: "approved" }), "/portal/grade-approvals", "warning");
      add("Open service requests", await ServiceRequest.countDocuments({ college, status: "submitted" }), "/portal/requests");
    }
    if (auth.has("dean", "department_head")) {
      const courses = auth.departmentIds.length ? { course: { $in: await Course.find({ college, department: { $in: auth.departmentIds } }).distinct("_id") } } : {};
      add("Grade sheets awaiting your approval", await Section.countDocuments({ college, gradeStatus: "submitted", ...courses }), "/portal/grade-approvals", "warning");
    }
    if (auth.has("instructor")) {
      add("Grade sheets returned to you", await Section.countDocuments({ college, instructor: auth.userId, gradeStatus: "returned" }), "/portal/teaching", "danger");
    }
    if (auth.has("finance_officer")) {
      add("Overdue invoices", await Invoice.countDocuments({ college, status: { $in: ["unpaid", "partial"] }, dueDate: { $lt: new Date() } }), "/portal/finance", "danger");
    }
    if (auth.has("student")) {
      const student = await Student.findOne({ user: auth.userId, college }).select("_id").lean();
      if (student) {
        add("New replies to your complaints", await Complaint.countDocuments({ student: student._id, studentUnread: true }), "/portal/my/complaints", "warning");
        add("Overdue fees", await Invoice.countDocuments({ student: student._id, status: { $in: ["unpaid", "partial"] }, dueDate: { $lt: new Date() } }), "/portal/my/finance", "danger");
        add("Registrations not approved", await Registration.countDocuments({ student: student._id, status: "rejected", updatedAt: { $gte: new Date(Date.now() - 14 * 864e5) } }), "/portal/my/registration");
      }
    }
  }
  return json({ items: notes, total: notes.reduce((s, n) => s + n.count, 0) });
});
