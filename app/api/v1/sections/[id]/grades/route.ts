import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, requireModule, zs } from "@/lib/api";
import { logGradeAction, saveDraftGrades } from "@/lib/grading";
import { GradeEntry } from "@/lib/models";
import { loadSection, rosterFor } from "@/lib/teaching";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "grading");
  const { section, isInstructor } = await loadSection(auth, (await params).id);
  const [students, entries] = await Promise.all([rosterFor(section._id), GradeEntry.find({ section: section._id }).lean()]);
  return json({
    section,
    isInstructor,
    students,
    entries: entries.map((e) => ({ ...e, scores: Object.fromEntries(Object.entries(e.scores ?? {})) })),
  });
});

const saveSchema = z.object({
  entries: z.array(z.object({ student: zs.id, scores: z.record(z.string(), z.number().nullable()) })).max(1000),
});

/** Instructor saves draft marks. */
export const PUT = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "grading");
  const { section } = await loadSection(auth, (await params).id, { write: true });
  const { entries } = await parseBody(req, saveSchema);
  const saved = await saveDraftGrades(auth, section as never, entries);
  await audit(auth, "save_grades", "Section", section._id, { saved });
  return json({ saved });
});

/** Instructor submits the complete mark sheet for department review. */
export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "grading");
  const { section } = await loadSection(auth, (await params).id, { write: true });
  const { note } = await parseBody(req, z.object({ note: zs.str(500) }));
  if (section.gradeStatus !== "open" && section.gradeStatus !== "returned") throw badRequest(`Grades are already ${section.gradeStatus}.`);
  const students = await rosterFor(section._id);
  if (!students.length) throw badRequest("There are no enrolled students to grade.");
  const entries = await GradeEntry.find({ section: section._id }).lean();
  const incomplete = students.filter((s) => !entries.find((e) => String(e.student) === String(s._id) && e.letter));
  if (incomplete.length) {
    throw badRequest(`Enter every assessment before submitting. Incomplete: ${incomplete.slice(0, 5).map((s) => s.studentId).join(", ")}${incomplete.length > 5 ? "…" : ""}`);
  }
  section.gradeStatus = "submitted";
  logGradeAction(section, auth, "submitted", note);
  await section.save();
  await audit(auth, "submit_grades", "Section", section._id, { students: students.length });
  return json({ ok: true });
});
