import { forbidden, getAuth, handler, json } from "@/lib/api";
import { AuditLog } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const query: Record<string, unknown> = {};
  if (!auth.isSuperAdmin) {
    if (!auth.collegeId || !auth.has("college_admin")) throw forbidden();
    query.college = auth.collegeId;
  }
  const action = req.nextUrl.searchParams.get("action");
  if (action) query.action = action;
  const items = await AuditLog.find(query).sort({ createdAt: -1 }).limit(300).populate("college", "code name").lean();
  return json({ items });
});
