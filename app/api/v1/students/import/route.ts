import { audit, getAuth, handler, json, requireCollegeRole } from "@/lib/api";
import { createStudentWithAccount } from "@/lib/academics";
import { readUploadedSheet } from "@/lib/excel";
import { Program } from "@/lib/models";

const MAX_ROWS = 2000;

/** Bulk-creates students from the registrar's Excel template. Each row succeeds or fails on its own. */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const form = await req.formData();
  const rows = await readUploadedSheet(form.get("file") as File | null);
  if (!rows.length) return json({ created: 0, failed: 0, results: [] });
  if (rows.length > MAX_ROWS) return json({ error: `Import at most ${MAX_ROWS} rows per file.` }, 400);

  const programs = await Program.find({ college }).select("code").lean();
  const byCode = new Map(programs.map((p) => [p.code.toUpperCase(), p._id]));
  const results: { row: number; ok: boolean; message?: string; name?: string; studentId?: string; username?: string; password?: string }[] = [];

  for (const row of rows) {
    const firstName = row.get("first name");
    const lastName = row.get("last name");
    const name = `${firstName} ${lastName}`.trim();
    const programCode = row.get("program code").toUpperCase();
    const email = row.get("email");
    const dob = row.get("date of birth");
    const problems: string[] = [];
    if (!firstName) problems.push("First Name is required");
    if (!lastName) problems.push("Last Name is required");
    if (!byCode.has(programCode)) problems.push(programCode ? `Unknown program code ${programCode}` : "Program Code is required");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(`Invalid email ${email}`);
    if (dob && Number.isNaN(Date.parse(dob))) problems.push(`Invalid date of birth ${dob}`);
    if (problems.length) {
      results.push({ row: row.rowNumber, ok: false, name, message: problems.join("; ") });
      continue;
    }
    try {
      const created = await createStudentWithAccount(college, {
        firstName,
        lastName,
        email: email || undefined,
        phone: row.get("phone") || undefined,
        gender: row.get("gender") || undefined,
        dateOfBirth: dob ? new Date(dob) : undefined,
        program: byCode.get(programCode)!,
        cohort: row.get("cohort") || undefined,
        studyMode: row.get("study mode") || undefined,
        studentId: row.get("student id") || undefined,
      });
      results.push({ row: row.rowNumber, ok: true, name, studentId: created.student.studentId, username: created.username, password: created.password });
    } catch (error) {
      results.push({ row: row.rowNumber, ok: false, name, message: (error as Error).message });
    }
  }
  const created = results.filter((r) => r.ok).length;
  await audit(auth, "import_students", "Student", null, { created, failed: results.length - created });
  return json({ created, failed: results.length - created, results });
});
