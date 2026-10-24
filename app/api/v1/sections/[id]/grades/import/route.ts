import { audit, badRequest, getAuth, handler, json, requireModule } from "@/lib/api";
import { readUploadedSheet } from "@/lib/excel";
import { assessmentHeader, saveDraftGrades } from "@/lib/grading";
import { loadSection, rosterFor } from "@/lib/teaching";

/** Instructor uploads the filled grade sheet; marks are validated and saved as drafts. */
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "grading");
  const { section } = await loadSection(auth, (await params).id, { write: true });
  const form = await req.formData();
  const rows = await readUploadedSheet(form.get("file") as File | null);
  const assessments = section.assessments as { name: string; weight: number }[];
  const roster = new Map((await rosterFor(section._id)).map((s) => [s.studentId.toUpperCase(), s]));

  const errors: string[] = [];
  const entries: { student: string; scores: Record<string, number | null> }[] = [];
  for (const row of rows) {
    const sid = row.get("student id").toUpperCase();
    const student = roster.get(sid);
    if (!student) {
      errors.push(`Row ${row.rowNumber}: student ${sid || "(blank)"} is not enrolled in this section.`);
      continue;
    }
    const scores: Record<string, number | null> = {};
    for (const a of assessments) {
      const raw = row.get(assessmentHeader(a)) || row.get(a.name);
      if (raw === "") continue;
      const value = Number(raw);
      if (Number.isNaN(value)) errors.push(`Row ${row.rowNumber} (${sid}): "${raw}" is not a number for ${a.name}.`);
      else if (value < 0 || value > a.weight) errors.push(`Row ${row.rowNumber} (${sid}): ${a.name} must be between 0 and ${a.weight}.`);
      else scores[a.name] = value;
    }
    entries.push({ student: String(student._id), scores });
  }
  if (errors.length) throw badRequest(`The file has ${errors.length} problem(s). Nothing was saved.`, errors.slice(0, 50));
  if (!entries.length) throw badRequest("No student rows were found in the file.");
  const saved = await saveDraftGrades(auth, section as never, entries);
  await audit(auth, "import_grades", "Section", section._id, { saved });
  return json({ saved });
});
