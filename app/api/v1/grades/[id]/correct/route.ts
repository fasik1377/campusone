import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { computeGrade } from "@/lib/academics";
import { GradeEntry, Section } from "@/lib/models";
import { gradingScaleFor } from "@/lib/teaching";

const schema = z.object({ scores: z.record(z.string(), z.number().nullable()), reason: zs.req(500) });

/** Registrar-authorised correction of a published grade. The previous values are preserved in history. */
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const entry = await GradeEntry.findOne({ _id: toId((await params).id, "Grade"), college });
  if (!entry) throw notFound("Grade");
  if (!entry.published) throw badRequest("Only published grades go through the correction process.");
  const section = await Section.findById(entry.section).lean();
  if (!section) throw notFound("Section");
  const { scores, reason } = await parseBody(req, schema);
  const result = computeGrade(scores, section.assessments as never, await gradingScaleFor(college));
  if (!result.complete) throw badRequest("Enter every assessment component for a corrected grade.");

  entry.history.push({
    scores: Object.fromEntries(entry.scores ?? new Map()),
    total: entry.total,
    letter: entry.letter,
    by: auth.user.name,
    reason,
    at: new Date(),
  });
  entry.set({ scores: result.scores, total: result.total, letter: result.letter, points: result.points });
  await entry.save();
  await audit(auth, "correct_grade", "GradeEntry", entry._id, { reason, from: entry.history.at(-1)?.letter, to: result.letter });
  return json({ item: entry });
});
