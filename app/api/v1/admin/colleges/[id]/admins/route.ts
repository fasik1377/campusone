import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireSuperAdmin, toId, zs } from "@/lib/api";
import { hashPassword } from "@/lib/academics";
import { College, User } from "@/lib/models";

type P = { id: string };

const schema = z.object({
  existingUsername: zs.str(60),
  name: zs.str(120),
  email: zs.email,
  username: zs.str(60),
  password: z.preprocess((v) => (v === "" ? undefined : v), zs.password.optional()),
});

export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const college = await College.findById(toId((await params).id, "College"));
  if (!college) throw notFound("College");
  const data = await parseBody(req, schema);

  let user;
  if (data.existingUsername) {
    user = await User.findOne({ username: data.existingUsername.toLowerCase() });
    if (!user) throw badRequest(`No user with username ${data.existingUsername}.`);
    if (user.roles.some((r) => r.role === "college_admin" && String(r.college) === String(college._id))) {
      throw badRequest("That user is already an administrator of this college.");
    }
    user.roles.push({ role: "college_admin", college: college._id });
    await user.save();
  } else {
    if (!data.name || !data.username || !data.password) {
      throw badRequest("Enter an existing username, or a name, username and initial password for a new administrator.");
    }
    if (await User.exists({ username: data.username.toLowerCase() })) throw badRequest(`Username ${data.username} is taken.`);
    if (data.email && (await User.exists({ email: data.email }))) throw badRequest(`Email ${data.email} is already registered.`);
    user = await User.create({
      name: data.name,
      email: data.email,
      username: data.username.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      roles: [{ role: "college_admin", college: college._id }],
      mustChangePassword: true,
    });
  }
  await audit(auth, "assign_college_admin", "User", user._id, { username: user.username }, college._id);
  return json({ ok: true }, 201);
});

export const DELETE = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const collegeId = toId((await params).id, "College");
  const user = await User.findById(toId(req.nextUrl.searchParams.get("userId"), "User"));
  if (!user) throw notFound("User");
  user.set(
    "roles",
    user.roles.filter((r) => !(r.role === "college_admin" && String(r.college) === String(collegeId))),
  );
  await user.save();
  await audit(auth, "remove_college_admin", "User", user._id, { username: user.username }, collegeId);
  return json({ ok: true });
});
