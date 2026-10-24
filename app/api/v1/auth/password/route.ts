import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, zs } from "@/lib/api";
import { hashPassword } from "@/lib/academics";
import { User } from "@/lib/models";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: zs.password });

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const { currentPassword, newPassword } = await parseBody(req, schema);
  const user = await User.findById(auth.userId).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest("Your current password is incorrect.");
  }
  if (currentPassword === newPassword) throw badRequest("Choose a password different from the current one.");
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  await audit(auth, "change_password", "User", user._id);
  return json({ ok: true });
});
