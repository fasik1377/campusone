import { getAuth, handler, json, requireCollegeRole } from "@/lib/api";
import { Registration, Section } from "@/lib/models";

/** Sections assigned to the signed-in instructor. */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "instructor");
  const sections = await Section.find({ college, instructor: auth.userId })
    .populate("course", "code title credits")
    .populate("semester", "name academicYear isCurrent")
    .sort({ createdAt: -1 })
    .lean();
  const counts = await Registration.aggregate<{ _id: unknown; n: number }>([
    { $match: { section: { $in: sections.map((s) => s._id) }, status: "approved" } },
    { $group: { _id: "$section", n: { $sum: 1 } } },
  ]);
  const items = sections.map((s) => ({ ...s, enrolled: counts.find((c) => String(c._id) === String(s._id))?.n ?? 0 }));
  return json({ items });
});
