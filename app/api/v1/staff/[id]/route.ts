import { z } from "zod";
import { audit, badRequest, forbidden, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { hashPassword, temporaryPassword } from "@/lib/academics";
import { User } from "@/lib/models";
import { staffRoleSchema, validateStaffRoles } from "@/lib/staff";

type P = { id: string };

const schema = z.object({
  name: zs.req(120).optional(),
  email: zs.email,
  status: z.enum(["active", "disabled"]).optional(),
  roles: staffRoleSchema.optional(),
  resetPassword: z.boolean().optional(),
  password: z.preprocess((v) => (v === "" ? undefined : v), zs.password.optional()),
});

export const PATCH = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "college_admin");
  const user = await User.findOne({ _id: toId((await params).id, "User"), "roles.college": college });
  if (!user) throw notFound("Staff member");
  if (user.isSuperAdmin) throw forbidden("Platform administrators can only be changed by the Super Admin.");
  const data = await parseBody(req, schema);
  if (String(user._id) === String(auth.userId) && (data.status === "disabled" || (data.roles && !data.roles.some((r) => r.role === "college_admin")))) {
    throw badRequest("You cannot disable yourself or remove your own College Admin role.");
  }

  if (data.name) user.name = data.name;
  if (data.email !== undefined && data.email !== user.email) {
    if (data.email && (await User.exists({ email: data.email, _id: { $ne: user._id } }))) throw badRequest("That email is already registered.");
    user.email = data.email;
  }
  // Roles a user has in other colleges are untouched; students keep their student role here.
  if (data.roles) {
    const roles = await validateStaffRoles(data.roles, college);
    const kept = user.roles.filter((r) => String(r.college) !== String(college) || r.role === "student");
    user.set("roles", [...kept, ...roles]);
  }
  // Disabling affects the whole account, so only allow it for people who belong solely to this college.
  if (data.status) {
    if (user.roles.some((r) => String(r.college) !== String(college))) throw badRequest("This user also works at another college; remove their roles instead.");
    user.status = data.status;
  }
  let password: string | undefined;
  if (data.password) {
    // Admin-chosen password; the user is asked to replace it at next sign-in.
    user.passwordHash = await hashPassword(data.password);
    user.mustChangePassword = true;
  } else if (data.resetPassword) {
    password = temporaryPassword();
    user.passwordHash = await hashPassword(password);
    user.mustChangePassword = true;
  }
  await user.save();
  await audit(auth, data.resetPassword || data.password ? "reset_password" : "update_staff", "User", user._id, { ...data, resetPassword: undefined, password: undefined });
  return json({ ok: true, temporaryPassword: password });
});
