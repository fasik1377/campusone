import { getAuth, handler, json } from "@/lib/api";
import { standingFor, transcriptFor } from "@/lib/academics";
import {
  Application,
  AuditLog,
  College,
  Course,
  GradeEntry,
  Invoice,
  Payment,
  Registration,
  Section,
  Semester,
  ServiceRequest,
  Student,
  User,
} from "@/lib/models";
import { DAYS, formatMoney } from "@/lib/roles";

type Stat = { label: string; value: string | number; href?: string; tone?: "default" | "warning" | "success" | "danger" };
type Panel = { title: string; stats: Stat[] };

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const panels: Panel[] = [];
  const college = auth.collegeId;
  const current = college ? await Semester.findOne({ college, isCurrent: true }).lean() : null;
  let activity: unknown[] = [];
  let today: unknown[] = [];

  if (auth.isSuperAdmin) {
    const [byStatus, users, students, applications] = await Promise.all([
      College.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      User.countDocuments({ status: "active" }),
      Student.countDocuments({ status: "active" }),
      Application.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } }),
    ]);
    const count = (s: string) => byStatus.find((r) => r._id === s)?.n ?? 0;
    panels.push({
      title: "Platform",
      stats: [
        { label: "Active colleges", value: count("active"), href: "/portal/colleges", tone: "success" },
        { label: "Pending setup", value: count("pending_setup"), href: "/portal/colleges", tone: "warning" },
        { label: "Suspended / archived", value: count("suspended") + count("archived"), href: "/portal/colleges", tone: "danger" },
        { label: "Active user accounts", value: users },
        { label: "Active students (all colleges)", value: students },
        { label: "Applications (30 days)", value: applications },
      ],
    });
    activity = await AuditLog.find().sort({ createdAt: -1 }).limit(10).populate("college", "code").lean();
  }

  if (college && !auth.collegeBlocked) {
    if (auth.has("college_admin")) {
      const [students, staff, pendingApps, unassigned, pendingRegs, gradeReview] = await Promise.all([
        Student.countDocuments({ college, status: "active" }),
        User.countDocuments({ roles: { $elemMatch: { college, role: { $ne: "student" } } }, status: "active" }),
        Application.countDocuments({ college, status: { $in: ["submitted", "under_review"] } }),
        Section.countDocuments({ college, ...(current ? { semester: current._id } : {}), instructor: { $exists: false } }),
        Registration.countDocuments({ college, status: "pending" }),
        Section.countDocuments({ college, gradeStatus: { $in: ["submitted", "approved"] } }),
      ]);
      panels.push({
        title: "College overview",
        stats: [
          { label: "Active students", value: students, href: "/portal/students" },
          { label: "Active staff", value: staff, href: "/portal/staff" },
          { label: "New / in-review applications", value: pendingApps, href: "/portal/applications", tone: pendingApps ? "warning" : "default" },
          { label: "Sections without instructor", value: unassigned, href: "/portal/sections", tone: unassigned ? "warning" : "success" },
          { label: "Registrations awaiting approval", value: pendingRegs, href: "/portal/registrations", tone: pendingRegs ? "warning" : "default" },
          { label: "Grade sheets in approval", value: gradeReview, href: "/portal/grade-approvals" },
        ],
      });
      activity = await AuditLog.find({ college }).sort({ createdAt: -1 }).limit(10).lean();
    }

    if (auth.has("registrar", "admissions_officer")) {
      const [apps, regs, toPublish, requests] = await Promise.all([
        Application.countDocuments({ college, status: { $in: ["submitted", "under_review", "info_required"] } }),
        Registration.countDocuments({ college, status: "pending" }),
        Section.countDocuments({ college, gradeStatus: "approved" }),
        ServiceRequest.countDocuments({ college, status: { $in: ["submitted", "in_progress"] } }),
      ]);
      panels.push({
        title: auth.has("registrar") ? "Registrar" : "Admissions",
        stats: [
          { label: "Applications requiring review", value: apps, href: "/portal/applications", tone: apps ? "warning" : "success" },
          ...(auth.has("registrar")
            ? [
                { label: "Students awaiting registration approval", value: regs, href: "/portal/registrations", tone: regs ? ("warning" as const) : ("success" as const) },
                { label: "Grade sheets ready to publish", value: toPublish, href: "/portal/grade-approvals", tone: toPublish ? ("warning" as const) : ("success" as const) },
                { label: "Open transcript / clearance requests", value: requests, href: "/portal/requests" },
              ]
            : []),
        ],
      });
    }

    if (auth.has("dean", "department_head")) {
      const deptFilter = auth.departmentIds.length ? { department: { $in: auth.departmentIds } } : {};
      const courseIds = await Course.find({ college, ...deptFilter }).distinct("_id");
      const sectionFilter = { college, course: { $in: courseIds }, ...(current ? { semester: current._id } : {}) };
      const [students, sections, submitted, notSubmitted, failing] = await Promise.all([
        Student.countDocuments({ college, status: "active", ...deptFilter }),
        Section.countDocuments(sectionFilter),
        Section.countDocuments({ ...sectionFilter, gradeStatus: "submitted" }),
        Section.countDocuments({ ...sectionFilter, gradeStatus: { $in: ["open", "returned"] } }),
        GradeEntry.countDocuments({ college, course: { $in: courseIds }, published: true, letter: "F" }),
      ]);
      panels.push({
        title: auth.departmentIds.length ? "My department" : "Faculty overview",
        stats: [
          { label: "Active students", value: students, href: "/portal/students" },
          { label: "Sections this semester", value: sections, href: "/portal/sections" },
          { label: "Grade sheets awaiting your approval", value: submitted, href: "/portal/grade-approvals", tone: submitted ? "warning" : "success" },
          { label: "Grade sheets not yet submitted", value: notSubmitted, href: "/portal/grade-approvals" },
          { label: "Failing grades (academic risk)", value: failing, tone: failing ? "danger" : "success" },
        ],
      });
    }

    if (auth.has("instructor")) {
      const mine = await Section.find({ college, instructor: auth.userId, ...(current ? { semester: current._id } : {}) })
        .populate("course", "code title")
        .lean();
      const enrolled = await Registration.countDocuments({ section: { $in: mine.map((s) => s._id) }, status: "approved" });
      const day = DAYS[(new Date().getDay() + 6) % 7];
      today = mine
        .flatMap((s) => (s.schedule ?? []).filter((x) => x.day === day).map((x) => ({ ...x, section: s._id, course: s.course, name: s.name })))
        .sort((a, b) => String(a.start).localeCompare(String(b.start)));
      panels.push({
        title: "My teaching",
        stats: [
          { label: "Assigned sections", value: mine.length, href: "/portal/teaching" },
          { label: "Students taught", value: enrolled, href: "/portal/teaching" },
          { label: "Classes today", value: today.length, href: "/portal/teaching" },
          { label: "Grade sheets to submit", value: mine.filter((s) => s.gradeStatus === "open" || s.gradeStatus === "returned").length, href: "/portal/teaching", tone: "warning" },
        ],
      });
    }

    if (auth.has("finance_officer")) {
      const [totals, recent] = await Promise.all([
        Invoice.aggregate<{ _id: null; billed: number; paid: number; overdue: number }>([
          { $match: { college, status: { $ne: "cancelled" } } },
          {
            $group: {
              _id: null,
              billed: { $sum: "$amount" },
              paid: { $sum: "$paidAmount" },
              overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", new Date()] }, { $ne: ["$status", "paid"] }] }, 1, 0] } },
            },
          },
        ]),
        Payment.countDocuments({ college, paidAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
      ]);
      const t = totals[0] ?? { billed: 0, paid: 0, overdue: 0 };
      panels.push({
        title: "Finance",
        stats: [
          { label: "Total billed", value: formatMoney(t.billed), href: "/portal/finance" },
          { label: "Collected", value: formatMoney(t.paid), href: "/portal/finance", tone: "success" },
          { label: "Outstanding", value: formatMoney(t.billed - t.paid), href: "/portal/finance", tone: "warning" },
          { label: "Overdue invoices", value: t.overdue, href: "/portal/finance", tone: t.overdue ? "danger" : "success" },
          { label: "Payments this week", value: recent, href: "/portal/finance" },
        ],
      });
    }

    if (auth.has("student")) {
      const student = await Student.findOne({ user: auth.userId, college }).lean();
      if (student) {
        const [transcript, regs, invoices, requests] = await Promise.all([
          transcriptFor(student._id),
          current ? Registration.find({ student: student._id, semester: current._id, status: { $in: ["pending", "approved"] } }).populate("course", "credits").lean() : [],
          Invoice.find({ student: student._id, status: { $in: ["unpaid", "partial"] } }).lean(),
          ServiceRequest.countDocuments({ student: student._id, status: { $in: ["submitted", "in_progress"] } }),
        ]);
        const balance = invoices.reduce((s, i) => s + i.amount - i.paidAmount, 0);
        const pending = regs.filter((r) => r.status === "pending").length;
        panels.push({
          title: current ? `${current.name} ${current.academicYear}` : "My studies",
          stats: [
            { label: "Registered courses", value: regs.length, href: "/portal/my/registration", tone: pending ? "warning" : "default" },
            { label: "Credits this semester", value: regs.reduce((s, r) => s + ((r.course as unknown as { credits: number })?.credits ?? 0), 0), href: "/portal/my/timetable" },
            { label: "Cumulative GPA", value: transcript.cgpa.toFixed(2), href: "/portal/my/grades", tone: transcript.cgpa && transcript.cgpa < 2 ? "danger" : "success" },
            { label: "Credits earned", value: transcript.creditsEarned, href: "/portal/my/grades" },
            { label: "Academic standing", value: standingFor(transcript.cgpa, transcript.creditsAttempted), href: "/portal/my/grades" },
            { label: "Balance due", value: formatMoney(balance), href: "/portal/my/finance", tone: balance ? "warning" : "success" },
            { label: "Open service requests", value: requests, href: "/portal/my/requests" },
          ],
        });
      }
    }
  }

  return json({ panels, activity, today, currentSemester: current });
});
