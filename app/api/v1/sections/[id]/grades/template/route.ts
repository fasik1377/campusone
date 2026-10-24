import { excelResponse, getAuth, handler } from "@/lib/api";
import { buildWorkbook } from "@/lib/excel";
import { assessmentHeader } from "@/lib/grading";
import { GradeEntry } from "@/lib/models";
import { loadSection, rosterFor } from "@/lib/teaching";

/** Grade sheet pre-filled with the class list and any marks already saved. */
export const GET = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { section, course, semester } = await loadSection(auth, (await params).id);
  const [students, entries] = await Promise.all([rosterFor(section._id), GradeEntry.find({ section: section._id }).lean()]);
  const assessments = section.assessments as { name: string; weight: number }[];
  const rows = students.map((s) => {
    const entry = entries.find((e) => String(e.student) === String(s._id));
    const scores = (entry?.scores ?? {}) as Record<string, number>;
    const row: Record<string, unknown> = { sid: s.studentId, name: `${s.firstName} ${s.lastName}`, total: entry?.total ?? "", letter: entry?.letter ?? "" };
    for (const a of assessments) row[a.name] = scores[a.name] ?? "";
    return row;
  });
  const buffer = await buildWorkbook([
    {
      name: "Grades",
      columns: [
        { header: "Student ID", key: "sid", width: 16 },
        { header: "Student Name", key: "name", width: 28 },
        ...assessments.map((a) => ({ header: assessmentHeader(a), key: a.name, width: Math.max(16, assessmentHeader(a).length + 2) })),
        { header: "Total (calculated)", key: "total", width: 18 },
        { header: "Grade (calculated)", key: "letter", width: 18 },
      ],
      rows,
      lockedKeys: ["sid", "name", "total", "letter"],
    },
    {
      name: "Instructions",
      columns: [{ header: `Grade sheet — ${course.code} ${course.title}, Section ${section.name}, ${semester.name} ${semester.academicYear}`, key: "t", width: 120 }],
      rows: [
        { t: "Enter marks in the assessment columns only. The maximum for each is shown in brackets, e.g. Midterm (/20)." },
        { t: "Do not change Student ID values. Leave a cell empty if the mark is not available yet." },
        { t: "Total and Grade are calculated by CampusOne after upload; anything typed there is ignored." },
        { t: "Upload from Portal → My Teaching → (section) → Grades → Upload Excel. Marks are saved as a draft until you submit." },
      ],
    },
  ]);
  return excelResponse(buffer, `grade-sheet-${course.code}-${section.name}.xlsx`.replace(/[^\w.-]+/g, "_"));
});
