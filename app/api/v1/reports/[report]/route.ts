import { audit, badRequest, excelResponse, getAuth, handler, notFound, requireCollegeRole } from "@/lib/api";
import { buildWorkbook, stamp, type SheetSpec } from "@/lib/excel";
import { GradeEntry, Registration, Semester, Student } from "@/lib/models";
import { humanize } from "@/lib/roles";
import type { Types } from "mongoose";

type Named = { code?: string; name?: string; title?: string; credits?: number; studentId?: string; firstName?: string; lastName?: string };
const n = (v: unknown) => v as Named;

async function semesterFor(college: Types.ObjectId, id: string | null) {
  const semester = id
    ? await Semester.findOne({ _id: id, college }).lean()
    : await Semester.findOne({ college, isCurrent: true }).lean();
  if (!semester) throw id ? notFound("Semester") : badRequest("Choose a semester (no current semester is set).");
  return semester;
}

export const GET = handler<{ report: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "college_admin");
  const { report } = await params;
  const semesterId = req.nextUrl.searchParams.get("semester");
  let sheets: SheetSpec[];
  let filename: string;

  if (report === "registrations") {
    const semester = await semesterFor(college, semesterId);
    const rows = await Registration.find({ college, semester: semester._id })
      .populate("student", "studentId firstName lastName")
      .populate("course", "code title credits")
      .populate("section", "name")
      .sort({ createdAt: 1 })
      .lean();
    sheets = [
      {
        name: "Registrations",
        columns: [
          { header: "Student ID", key: "sid", width: 16 },
          { header: "Student Name", key: "name", width: 28 },
          { header: "Course Code", key: "code", width: 14 },
          { header: "Course Title", key: "title", width: 34 },
          { header: "Credits", key: "credits", width: 9 },
          { header: "Section", key: "section", width: 9 },
          { header: "Status", key: "status", width: 12 },
          { header: "Decided By", key: "decidedBy", width: 20 },
        ],
        rows: rows.map((r) => ({
          sid: n(r.student)?.studentId,
          name: `${n(r.student)?.firstName} ${n(r.student)?.lastName}`,
          code: n(r.course)?.code,
          title: n(r.course)?.title,
          credits: n(r.course)?.credits,
          section: n(r.section)?.name,
          status: humanize(r.status),
          decidedBy: r.decidedBy,
        })),
      },
    ];
    filename = `registrations-${semester.name}-${semester.academicYear}.xlsx`;
  } else if (report === "results") {
    const semester = await semesterFor(college, semesterId);
    const entries = await GradeEntry.find({ college, semester: semester._id, published: true })
      .populate("student", "studentId firstName lastName")
      .populate("course", "code title credits")
      .lean();
    const gpa = new Map<string, { sid?: string; name: string; credits: number; points: number }>();
    for (const e of entries) {
      const key = String(n(e.student)?.studentId);
      const row = gpa.get(key) ?? { sid: n(e.student)?.studentId, name: `${n(e.student)?.firstName} ${n(e.student)?.lastName}`, credits: 0, points: 0 };
      row.credits += n(e.course)?.credits ?? 0;
      row.points += (e.points ?? 0) * (n(e.course)?.credits ?? 0);
      gpa.set(key, row);
    }
    sheets = [
      {
        name: "Results",
        columns: [
          { header: "Student ID", key: "sid", width: 16 },
          { header: "Student Name", key: "name", width: 28 },
          { header: "Course Code", key: "code", width: 14 },
          { header: "Course Title", key: "title", width: 34 },
          { header: "Credits", key: "credits", width: 9 },
          { header: "Total", key: "total", width: 9 },
          { header: "Grade", key: "letter", width: 9 },
          { header: "Grade Points", key: "points", width: 12 },
        ],
        rows: entries.map((e) => ({
          sid: n(e.student)?.studentId,
          name: `${n(e.student)?.firstName} ${n(e.student)?.lastName}`,
          code: n(e.course)?.code,
          title: n(e.course)?.title,
          credits: n(e.course)?.credits,
          total: e.total,
          letter: e.letter,
          points: e.points,
        })),
      },
      {
        name: "Semester GPA",
        columns: [
          { header: "Student ID", key: "sid", width: 16 },
          { header: "Student Name", key: "name", width: 28 },
          { header: "Credits", key: "credits", width: 10 },
          { header: "GPA", key: "gpa", width: 10 },
        ],
        rows: [...gpa.values()].map((r) => ({ ...r, gpa: r.credits ? +(r.points / r.credits).toFixed(2) : 0 })),
      },
    ];
    filename = `result-sheet-${semester.name}-${semester.academicYear}.xlsx`;
  } else if (report === "enrollment") {
    const students = await Student.find({ college }).populate("program", "code name").populate("department", "name").lean();
    const group = (key: (s: (typeof students)[number]) => string) => {
      const map = new Map<string, Record<string, number>>();
      for (const s of students) {
        const k = key(s) || "—";
        const row = map.get(k) ?? { total: 0 };
        row.total++;
        row[s.status] = (row[s.status] ?? 0) + 1;
        map.set(k, row);
      }
      return [...map.entries()].map(([label, counts]) => ({ label, ...counts }));
    };
    const statusColumns = ["active", "on_leave", "suspended", "withdrawn", "graduated"].map((s) => ({ header: humanize(s), key: s, width: 12 }));
    sheets = [
      { name: "By Program", columns: [{ header: "Program", key: "label", width: 40 }, { header: "Total", key: "total", width: 10 }, ...statusColumns], rows: group((s) => `${n(s.program)?.code} — ${n(s.program)?.name}`) },
      { name: "By Department", columns: [{ header: "Department", key: "label", width: 36 }, { header: "Total", key: "total", width: 10 }, ...statusColumns], rows: group((s) => n(s.department)?.name ?? "") },
      { name: "By Cohort", columns: [{ header: "Cohort", key: "label", width: 14 }, { header: "Total", key: "total", width: 10 }, ...statusColumns], rows: group((s) => s.cohort ?? "") },
    ];
    filename = `enrollment-report-${stamp()}.xlsx`;
  } else {
    throw notFound("Report");
  }

  await audit(auth, "export_report", "Report", null, { report, semester: semesterId });
  return excelResponse(await buildWorkbook(sheets), filename.replace(/[^\w.-]+/g, "_"));
});
