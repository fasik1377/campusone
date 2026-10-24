import { getAuth, getOwnStudent, handler, json, requireModule } from "@/lib/api";
import { Semester } from "@/lib/models";
import { checkEligibility, openSections, registrationContext, seatsTaken } from "@/lib/registration";

/** Sections a student can browse for every semester with registration open, with eligibility explained. */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  requireModule(auth, "registration");
  const student = await getOwnStudent(auth);
  const semesters = await Semester.find({ college: student.college, registrationOpen: true }).sort({ startDate: 1 }).lean();
  const result = [];
  for (const semester of semesters) {
    const sections = await openSections(student.college, semester._id);
    const taken = await seatsTaken(sections.map((s) => s._id));
    const ctx = await registrationContext(student, semester._id);
    const rows = [];
    for (const section of sections) {
      const seats = taken.get(String(section._id)) ?? 0;
      const reason = await checkEligibility(ctx, section as never, seats);
      rows.push({ ...section, seatsTaken: seats, eligible: !reason, reason });
    }
    result.push({ semester, sections: rows, currentCredits: ctx.current.reduce((s, c) => s + (c.course?.credits ?? 0), 0), maxCredits: ctx.maxCredits });
  }
  return json({ semesters: result });
});
