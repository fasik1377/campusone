import { handler, json } from "@/lib/api";
import { College, Semester } from "@/lib/models";

/** Current and upcoming semesters of active colleges, for the public "Important dates" section. */
export const GET = handler(async () => {
  const colleges = await College.find({ status: "active" }).select("name slug").lean();
  const semesters = await Semester.find({
    college: { $in: colleges.map((c) => c._id) },
    $or: [{ isCurrent: true }, { registrationOpen: true }, { startDate: { $gte: new Date() } }],
  })
    .select("college name academicYear startDate endDate registrationOpen isCurrent")
    .sort({ startDate: 1 })
    .limit(12)
    .lean();
  const items = semesters.map((s) => {
    const c = colleges.find((x) => String(x._id) === String(s.college));
    return { ...s, college: c ? { name: c.name, slug: c.slug } : null };
  });
  return json({ items });
});
