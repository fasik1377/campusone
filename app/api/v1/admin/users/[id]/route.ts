import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireSuperAdmin, toId, zs } from "@/lib/api";
import { hashPassword, temporaryPassword } from "@/lib/academics";
import { College, User } from "@/lib/models";
import { staffRoleSchema, validateStaffRoles } from "@/lib/staff";

const schema = z.object({
  name: zs.req(120).optional(),
  email: zs.email,
  username: zs.username.optional(),
  status: z.enum(["active", "disabled"]).optional(),
  // Either set a password the admin chooses, or generate a temporary one.
  password: z.preprocess((v) => (v === "" ? undefined : v), zs.password.optional()),
  resetPassword: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  // Replaces this user's staff roles in one college; student roles stay tied to the student record.
  collegeRoles: z.object({ college: zs.id, roles: staffRoleSchema }).optional(),
});

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const user = await User.findById(toId((await params).id, "User"));
  if (!user) throw notFound("User");
  const data = await parseBody(req, schema);
  const self = String(user._id) === String(auth.userId);
  if (self && data.status === "disabled") throw badRequest("You cannot disable your own account.");

  if (data.name) user.name = data.name;
  if (data.username && data.username !== user.username) {
    if (await User.exists({ username: data.username, _id: { $ne: user._id } })) throw badRequest(`Username ${data.username} is already taken.`);
    user.username = data.username;
  }
  if (data.email !== undefined && data.email !== user.email) {
    if (data.email && (await User.exists({ email: data.email, _id: { $ne: user._id } }))) throw badRequest("That email is already registered.");
    user.email = data.email;
  }
  if (data.status) user.status = data.status;
  if (data.collegeRoles) {
    const college = await College.findById(data.collegeRoles.college).select("_id").lean();
    if (!college) throw badRequest("College not found.");
    const kept = user.roles.filter((r) => String(r.college) !== String(college._id) || r.role === "student");
    const next = data.collegeRoles.roles.length ? await validateStaffRoles(data.collegeRoles.roles, college._id) : [];
    if (!user.isSuperAdmin && !kept.length && !next.length) throw badRequest("A user needs at least one role. Disable the account instead.");
    user.set("roles", [...kept, ...next]);
  }

  let temporary: string | undefined;
  if (data.password) {
    user.passwordHash = await hashPassword(data.password);
    user.mustChangePassword = data.mustChangePassword ?? !self;
  } else if (data.resetPassword) {
    temporary = temporaryPassword();
    user.passwordHash = await hashPassword(temporary);
    user.mustChangePassword = true;
  } else if (data.mustChangePassword !== undefined) {
    user.mustChangePassword = data.mustChangePassword;
  }
  await user.save();
  const { password: _omit, ...logged } = data;
  void _omit;
  await audit(auth, data.password || data.resetPassword ? "set_user_password" : "update_user", "User", user._id, { ...logged, username: user.username }, null);
  return json({ ok: true, temporaryPassword: temporary });
});
