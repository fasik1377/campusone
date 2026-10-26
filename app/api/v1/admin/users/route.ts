import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, requireSuperAdmin, zs } from "@/lib/api";
import { createStudentWithAccount, hashPassword } from "@/lib/academics";
import { College, User } from "@/lib/models";
import { ROLES } from "@/lib/roles";
import { validateStaffRoles } from "@/lib/staff";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every account on the platform, with role assignments per college. */
export const GET = handler(async (req) => {
  requireSuperAdmin(await getAuth(req));
  const p = req.nextUrl.searchParams;
  const query: Record<string, unknown> = {};
  const college = p.get("college");
  const role = p.get("role");
  if (role === "super_admin") query.isSuperAdmin = true;
  else if (college || role) query.roles = { $elemMatch: { ...(college && { college }), ...(role && { role }) } };
  const status = p.get("status");
  if (status) query.status = status;
  const q = p.get("q")?.trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    query.$or = [{ name: rx }, { username: rx }, { email: rx }];
  }
  const items = await User.find(query)
    .select("name email username status isSuperAdmin roles mustChangePassword lastLoginAt createdAt")
    .populate("roles.college", "name code")
    .populate("roles.department", "name code")
    .sort({ isSuperAdmin: -1, name: 1 })
    .limit(2000)
    .lean();
  return json({ items });
});

const schema = z.object({
  name: zs.req(120),
  email: zs.email,
  username: zs.username,
  password: zs.password,
  mustChangePassword: z.boolean().default(true),
  college: zs.id,
  roles: z.array(z.object({ role: z.enum(ROLES as [string, ...string[]]), department: zs.optId })).min(1, "Choose at least one role"),
  // Needed only when the account includes the Student role.
  program: zs.optId,
  studentId: zs.str(40),
});

/** Super Admin creates an account with a username, password and role(s) in a college. */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const data = await parseBody(req, schema);
  const college = await College.findById(data.college).select("_id name").lean();
  if (!college) throw badRequest("College not found.");
  if (await User.exists({ username: data.username })) throw badRequest(`Username ${data.username} is already taken.`);
  if (data.email && (await User.exists({ email: data.email }))) throw badRequest(`Email ${data.email} is already registered.`);

  const isStudent = data.roles.some((r) => r.role === "student");
  const staffRoles = data.roles.filter((r) => r.role !== "student");
  const staff = staffRoles.length ? await validateStaffRoles(staffRoles, college._id) : [];

  let userId;
  if (isStudent) {
    if (!data.program) throw badRequest("Choose the student's program.");
    const [firstName, ...rest] = data.name.split(/\s+/);
    if (!rest.length) throw badRequest("Enter the student's first and last name.");
    const created = await createStudentWithAccount(college._id, {
      firstName,
      lastName: rest.join(" "),
      email: data.email,
      program: data.program,
      studentId: data.studentId,
      username: data.username,
      password: data.password,
      mustChangePassword: data.mustChangePassword,
    });
    userId = created.student.user;
    if (staff.length) await User.updateOne({ _id: userId }, { $push: { roles: { $each: staff } } });
  } else {
    const user = await User.create({
      name: data.name,
      email: data.email,
      username: data.username,
      passwordHash: await hashPassword(data.password),
      roles: staff,
      mustChangePassword: data.mustChangePassword,
    });
    userId = user._id;
  }
  await audit(auth, "create_user", "User", userId, { username: data.username, roles: data.roles.map((r) => r.role) }, college._id);
  return json({ item: { _id: userId, username: data.username } }, 201);
});
