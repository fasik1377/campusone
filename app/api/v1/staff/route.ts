import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, requireCollegeRole, zs } from "@/lib/api";
import { hashPassword } from "@/lib/academics";
import { User } from "@/lib/models";
import { staffRoleSchema, validateStaffRoles } from "@/lib/staff";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "college_admin", "registrar", "dean", "department_head");
  const role = req.nextUrl.searchParams.get("role");
  const match: Record<string, unknown> = { college, role: role ?? { $ne: "student" } };
  const users = await User.find({ roles: { $elemMatch: match } })
    .select("name email username status roles lastLoginAt createdAt")
    .populate("roles.department", "name code")
    .sort({ name: 1 })
    .lean();
  // Only expose this college's assignments, never roles held elsewhere.
  const items = users.map((u) => ({ ...u, roles: u.roles.filter((r) => String(r.college) === String(college)) }));
  return json({ items });
});

const schema = z.object({
  name: zs.req(120),
  email: zs.email,
  username: z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore"),
  password: zs.password,
  roles: staffRoleSchema,
});

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "college_admin");
  const data = await parseBody(req, schema);
  const roles = await validateStaffRoles(data.roles, college);
  if (await User.exists({ username: data.username })) throw badRequest(`Username ${data.username} is taken.`);
  if (data.email && (await User.exists({ email: data.email }))) throw badRequest(`Email ${data.email} is already registered.`);
  const user = await User.create({
    name: data.name,
    email: data.email,
    username: data.username,
    passwordHash: await hashPassword(data.password),
    roles,
    mustChangePassword: true,
  });
  await audit(auth, "create_staff", "User", user._id, { username: user.username, roles: data.roles.map((r) => r.role) });
  return json({ item: { _id: user._id, username: user.username } }, 201);
});
