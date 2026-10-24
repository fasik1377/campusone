import { excelResponse, getAuth, handler } from "@/lib/api";
import { buildWorkbook } from "@/lib/excel";
import { Attendance } from "@/lib/models";
import { humanize } from "@/lib/roles";
import { loadSection, rosterFor } from "@/lib/teaching";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { section, course } = await loadSection(auth, (await params).id);
  const [sessions, students] = await Promise.all([
    Attendance.find({ section: section._id }).sort({ date: 1 }).lean(),
    rosterFor(section._id),
  ]);
  const rows = students.map((s) => {
    const row: Record<string, unknown> = { sid: s.studentId, name: `${s.firstName} ${s.lastName}` };
    let attended = 0;
    let total = 0;
    for (const session of sessions) {
      const rec = session.records.find((r) => String(r.student) === String(s._id));
      row[session.date] = rec ? humanize(rec.status ?? "") : "";
      if (rec) {
        total++;
        if (rec.status !== "absent") attended++;
      }
    }
    row.percent = total ? `${Math.round((attended / total) * 100)}%` : "";
    return row;
  });
  const buffer = await buildWorkbook([
    {
      name: "Attendance",
      columns: [
        { header: "Student ID", key: "sid", width: 16 },
        { header: "Student Name", key: "name", width: 28 },
        ...sessions.map((s) => ({ header: s.date, key: s.date, width: 12 })),
        { header: "Attendance %", key: "percent", width: 14 },
      ],
      rows,
    },
  ]);
  return excelResponse(buffer, `attendance-${course.code}-${section.name}.xlsx`);
});
