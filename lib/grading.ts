import "server-only";
import type { Types } from "mongoose";
import { type Auth, badRequest } from "./api";
import { computeGrade, type Assessment } from "./academics";
import { GradeEntry } from "./models";
import { gradingScaleFor, rosterFor } from "./teaching";

export const assessmentHeader = (a: Assessment) => `${a.name} (/${a.weight})`;

type SectionDoc = {
  _id: Types.ObjectId;
  college: Types.ObjectId;
  semester: unknown;
  course: unknown;
  gradeStatus: string;
  assessments: Assessment[];
};

/** Validates every row first, then saves them all as unpublished drafts. */
export async function saveDraftGrades(
  auth: Auth,
  section: SectionDoc,
  entries: { student: string; scores: Record<string, number | null | undefined> }[],
) {
  if (section.gradeStatus !== "open" && section.gradeStatus !== "returned") {
    throw badRequest(`Grades are ${section.gradeStatus}; they can only be edited after a reviewer returns them.`);
  }
  const roster = new Map((await rosterFor(section._id)).map((s) => [String(s._id), s]));
  const scale = await gradingScaleFor(section.college);
  const computed = entries.map((e) => {
    const student = roster.get(e.student);
    if (!student) throw badRequest("Marks include a student who is not enrolled in this section.");
    return { student, result: computeGrade(e.scores, section.assessments, scale, `${student.studentId}`) };
  });
  const semester = ((section.semester as { _id?: unknown })?._id ?? section.semester) as Types.ObjectId;
  const course = ((section.course as { _id?: unknown })?._id ?? section.course) as Types.ObjectId;
  for (const { student, result } of computed) {
    await GradeEntry.findOneAndUpdate(
      { section: section._id, student: student._id },
      {
        $set: {
          college: section.college,
          course,
          semester,
          scores: result.scores,
          total: result.total,
          letter: result.letter ?? null,
          points: result.points ?? null,
          published: false,
        },
      },
      { upsert: true },
    );
  }
  return computed.length;
}

export function logGradeAction(section: { gradeLog: unknown[] }, auth: Auth, action: string, note?: string) {
  section.gradeLog.push({ action, by: auth.userId, byName: auth.user.name, note, at: new Date() });
}
