import { handler, json } from "@/lib/api";
import { College, Program } from "@/lib/models";

export const GET = handler(async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const query: Record<string, unknown> = { status: "active" };
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ name: rx }, { code: rx }, { address: rx }, { tagline: rx }];
  }
  const colleges = await College.find(query)
    .select("name code slug tagline address logoFileId enabledModules")
    .sort({ name: 1 })
    .lean();
  const counts = await Program.aggregate<{ _id: unknown; n: number; open: number }>([
    { $match: { college: { $in: colleges.map((c) => c._id) } } },
    { $group: { _id: "$college", n: { $sum: 1 }, open: { $sum: { $cond: ["$admissionOpen", 1, 0] } } } },
  ]);
  const items = colleges.map((c) => {
    const row = counts.find((r) => String(r._id) === String(c._id));
    return {
      ...c,
      programCount: row?.n ?? 0,
      admissionsOpen: !!row?.open && c.enabledModules.includes("admissions"),
    };
  });
  return json({ items });
});
