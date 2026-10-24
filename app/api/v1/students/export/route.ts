import { audit, excelResponse, getAuth, handler, requireCollegeRole } from "@/lib/api";
import { buildWorkbook, fmtDate, stamp, STUDENT_COLUMNS } from "@/lib/excel";
import { Student } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "college_admin");
  const params = req.nextUrl.searchParams;
  const query: Record<string, unknown> = { college };
  for (const key of ["status", "program", "department", "cohort"]) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  const students = await Student.find(query)
    .populate("program", "code name")
    .populate("department", "name")
    .sort({ studentId: 1 })
    .lean();
  type Named = { code?: string; name?: string };
  const buffer = await buildWorkbook([
    {
      name: "Students",
      columns: [
        ...STUDENT_COLUMNS,
        { header: "Program", key: "programName", width: 32 },
        { header: "Department", key: "department", width: 26 },
        { header: "Status", key: "status", width: 12 },
        { header: "Admission Date", key: "admissionDate", width: 15 },
      ],
      rows: students.map((s) => ({
        ...s,
        dateOfBirth: fmtDate(s.dateOfBirth),
        admissionDate: fmtDate(s.admissionDate),
        programCode: (s.program as unknown as Named)?.code,
        programName: (s.program as unknown as Named)?.name,
        department: (s.department as unknown as Named)?.name,
      })),
    },
  ]);
  await audit(auth, "export_students", "Student", null, { count: students.length });
  return excelResponse(buffer, `students-${stamp()}.xlsx`);
});
