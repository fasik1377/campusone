import { excelResponse, getAuth, handler } from "@/lib/api";
import { buildWorkbook } from "@/lib/excel";
import { humanize } from "@/lib/roles";
import { loadSection, rosterFor } from "@/lib/teaching";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { section, course, semester } = await loadSection(auth, (await params).id);
  const students = await rosterFor(section._id);
  const buffer = await buildWorkbook([
    {
      name: "Class List",
      columns: [
        { header: "No.", key: "no", width: 6 },
        { header: "Student ID", key: "sid", width: 16 },
        { header: "First Name", key: "first", width: 18 },
        { header: "Last Name", key: "last", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Status", key: "status", width: 12 },
      ],
      rows: students.map((s, i) => ({ no: i + 1, sid: s.studentId, first: s.firstName, last: s.lastName, email: s.email, status: humanize(s.status) })),
    },
  ]);
  return excelResponse(buffer, `class-list-${course.code}-${section.name}-${semester.name}.xlsx`.replace(/[^\w.-]+/g, "_"));
});
