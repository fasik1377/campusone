import type { Types } from "mongoose";
import { getAuth, getOwnStudent, handler, json } from "@/lib/api";
import { standingFor, transcriptFor } from "@/lib/academics";
import { Attendance, Invoice, Registration, Semester } from "@/lib/models";

/** Everything the student dashboard, timetable, grades and finance pages need. */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const student = await getOwnStudent(auth);
  await student.populate([
    { path: "program", select: "name code totalCredits minGpa durationYears" },
    { path: "department", select: "name" },
  ]);
  const current = await Semester.findOne({ college: student.college, isCurrent: true }).lean();
  const [registrations, transcript, invoices] = await Promise.all([
    Registration.find({ student: student._id, status: { $in: ["pending", "approved", "rejected"] } })
      .populate("course", "code title credits")
      .populate("semester", "name academicYear isCurrent registrationOpen")
      .populate({ path: "section", select: "name schedule instructor", populate: { path: "instructor", select: "name" } })
      .sort({ createdAt: -1 })
      .lean(),
    transcriptFor(student._id),
    Invoice.find({ student: student._id, status: { $ne: "cancelled" } }).sort({ dueDate: 1 }).lean(),
  ]);

  const approvedSections = registrations.filter((r) => r.status === "approved").map((r) => (r.section as unknown as { _id: Types.ObjectId })._id);
  const sessions = await Attendance.find({ section: { $in: approvedSections } }).select("section records").lean();
  const attendance = approvedSections.map((sectionId) => {
    let attended = 0;
    let total = 0;
    for (const s of sessions.filter((x) => String(x.section) === String(sectionId))) {
      const rec = s.records.find((r) => String(r.student) === String(student._id));
      if (!rec) continue;
      total++;
      if (rec.status !== "absent") attended++;
    }
    return { section: sectionId, attended, total, percent: total ? Math.round((attended / total) * 100) : null };
  });

  const balance = invoices.reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  return json({
    student,
    currentSemester: current,
    registrations,
    transcript: { ...transcript, standing: standingFor(transcript.cgpa, transcript.creditsAttempted) },
    invoices,
    balance,
    attendance,
  });
});
