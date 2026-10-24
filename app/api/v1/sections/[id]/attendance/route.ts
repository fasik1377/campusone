import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, requireModule, zs } from "@/lib/api";
import { Attendance } from "@/lib/models";
import { ATTENDANCE_STATUSES } from "@/lib/roles";
import { loadSection, rosterFor } from "@/lib/teaching";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "attendance");
  const { section } = await loadSection(auth, (await params).id);
  const [sessions, students] = await Promise.all([
    Attendance.find({ section: section._id }).sort({ date: -1 }).lean(),
    rosterFor(section._id),
  ]);
  // Percentage counts present, late and excused as attended.
  const summary = students.map((s) => {
    let attended = 0;
    let total = 0;
    for (const session of sessions) {
      const rec = session.records.find((r) => String(r.student) === String(s._id));
      if (!rec) continue;
      total++;
      if (rec.status !== "absent") attended++;
    }
    return { student: s._id, attended, total, percent: total ? Math.round((attended / total) * 100) : null };
  });
  return json({ sessions, students, summary });
});

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  records: z.array(z.object({ student: zs.id, status: z.enum(ATTENDANCE_STATUSES) })).min(1),
});

export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "attendance");
  const { section, college } = await loadSection(auth, (await params).id, { write: true });
  const { date, records } = await parseBody(req, schema);
  if (date > new Date().toISOString().slice(0, 10)) throw badRequest("Attendance cannot be recorded for a future date.");
  const roster = new Set((await rosterFor(section._id)).map((s) => String(s._id)));
  if (records.some((r) => !roster.has(r.student))) throw badRequest("Attendance includes a student not enrolled in this section.");

  const existing = await Attendance.findOne({ section: section._id, date });
  if (existing) {
    // Re-saving a past date is a correction and is logged.
    existing.set("records", records);
    existing.corrections.push({ by: auth.user.name, at: new Date() });
    await existing.save();
    await audit(auth, "correct_attendance", "Attendance", existing._id, { date });
    return json({ item: existing });
  }
  const item = await Attendance.create({ college, section: section._id, date, records, recordedBy: auth.user.name });
  await audit(auth, "record_attendance", "Attendance", item._id, { date, count: records.length });
  return json({ item }, 201);
});
