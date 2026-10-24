import { excelResponse, getAuth, handler, requireCollegeRole } from "@/lib/api";
import { buildWorkbook, STUDENT_COLUMNS } from "@/lib/excel";
import { Program } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const programs = await Program.find({ college }).populate("department", "name").sort({ code: 1 }).lean();
  const buffer = await buildWorkbook([
    { name: "Students", columns: STUDENT_COLUMNS, rows: [] },
    {
      name: "Programs (reference)",
      columns: [
        { header: "Program Code", key: "code", width: 16 },
        { header: "Program Name", key: "name", width: 40 },
        { header: "Department", key: "department", width: 30 },
      ],
      rows: programs.map((p) => ({ code: p.code, name: p.name, department: (p.department as unknown as { name: string })?.name })),
    },
    {
      name: "Instructions",
      columns: [{ header: "How to fill this template", key: "text", width: 110 }],
      rows: [
        { text: "1. Fill one student per row on the Students sheet. Do not rename the header row." },
        { text: "2. Required: First Name, Last Name, Program Code (see the Programs sheet)." },
        { text: "3. Date of Birth must be YYYY-MM-DD. Gender: Male / Female." },
        { text: "4. Leave Student ID empty to have CampusOne generate one automatically." },
        { text: "5. Upload the file from Portal → Students → Import from Excel. A login account is created for every student." },
      ],
    },
  ]);
  return excelResponse(buffer, "student-import-template.xlsx");
});
