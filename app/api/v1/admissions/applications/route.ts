import { getAuth, handler, json, requireCollegeRole, requireModule } from "@/lib/api";
import { Application } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "admissions_officer", "college_admin");
  requireModule(auth, "admissions");
  const params = req.nextUrl.searchParams;
  const query: Record<string, unknown> = { college };
  const status = params.get("status");
  if (status) query.status = status;
  const program = params.get("program");
  if (program) query.program = program;
  const q = params.get("q")?.trim();
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ applicationNumber: rx }, { firstName: rx }, { lastName: rx }, { email: rx }];
  }
  const items = await Application.find(query)
    .select("-history -statement")
    .populate("program", "name code")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  return json({ items });
});
