import { z } from "zod";
import { audit, forbidden, getAuth, handler, json, parseBody, requireCollegeRole, zs } from "@/lib/api";
import { Announcement } from "@/lib/models";
import { ROLES } from "@/lib/roles";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const or: Record<string, unknown>[] = [{ college: null }, { college: { $exists: false } }];
  if (auth.collegeId && !auth.collegeBlocked) or.push({ college: auth.collegeId });
  const mine = req.nextUrl.searchParams.get("manage") === "1";
  const query: Record<string, unknown> = { $or: or };
  // Viewers only see posts addressed to everyone or to one of their roles; managers see all.
  const canManage = auth.isSuperAdmin || auth.has("college_admin", "registrar", "dean", "department_head");
  if (!(mine && canManage)) query.$and = [{ $or: [{ audience: { $size: 0 } }, { audience: { $in: auth.roles } }] }];
  const items = await Announcement.find(query).sort({ createdAt: -1 }).limit(100).lean();
  return json({ items });
});

const schema = z.object({
  title: zs.req(150),
  body: zs.req(5000),
  audience: z.array(z.enum(ROLES as [string, ...string[]])).default([]),
  isPublic: zs.bool.default(false),
  platformWide: zs.bool.default(false),
});

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const data = await parseBody(req, schema);
  let college = null;
  if (data.platformWide) {
    if (!auth.isSuperAdmin) throw forbidden("Only platform administrators can post platform-wide announcements.");
  } else {
    college = requireCollegeRole(auth, "college_admin", "registrar", "dean", "department_head");
  }
  const item = await Announcement.create({
    college,
    title: data.title,
    body: data.body,
    audience: data.audience,
    isPublic: data.isPublic,
    createdBy: auth.user.name,
  });
  await audit(auth, "create_announcement", "Announcement", item._id, { title: data.title }, college);
  return json({ item }, 201);
});
