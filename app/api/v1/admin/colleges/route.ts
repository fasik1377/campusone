import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, parseBody, requireSuperAdmin, zs } from "@/lib/api";
import { hashPassword } from "@/lib/academics";
import { collegeModulesSchema, collegeProfileSchema, uniqueSlug } from "@/lib/colleges";
import { College, Student, User } from "@/lib/models";
import { MODULE_KEYS } from "@/lib/roles";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const colleges = await College.find().sort({ createdAt: -1 }).lean();
  const [students, staff] = await Promise.all([
    Student.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$college", n: { $sum: 1 } } }]),
    User.aggregate<{ _id: unknown; n: number }>([
      { $unwind: "$roles" },
      { $match: { "roles.role": { $ne: "student" } } },
      { $group: { _id: { c: "$roles.college", u: "$_id" } } },
      { $group: { _id: "$_id.c", n: { $sum: 1 } } },
    ]),
  ]);
  const count = (rows: { _id: unknown; n: number }[], id: unknown) => rows.find((r) => String(r._id) === String(id))?.n ?? 0;
  return json({
    items: colleges.map((c) => ({ ...c, studentCount: count(students, c._id), staffCount: count(staff, c._id) })),
  });
});

const createSchema = collegeProfileSchema.extend({
  code: z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9]+$/, "Code may only contain letters and numbers"),
  enabledModules: collegeModulesSchema.optional(),
  adminName: zs.str(120),
  adminEmail: zs.email,
  adminUsername: zs.str(60),
  adminPassword: z.preprocess((v) => (v === "" ? undefined : v), zs.password.optional()),
  existingAdminUsername: zs.str(60),
});

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const { adminName, adminEmail, adminUsername, adminPassword, existingAdminUsername, ...data } = await parseBody(req, createSchema);
  const code = data.code.toUpperCase();
  if (await College.exists({ code })) throw badRequest(`College code ${code} is already in use.`);

  let existingAdmin = null;
  if (existingAdminUsername) {
    existingAdmin = await User.findOne({ username: existingAdminUsername.toLowerCase() });
    if (!existingAdmin) throw badRequest(`No user with username ${existingAdminUsername}.`);
  } else if (adminUsername) {
    if (!adminName || !adminPassword) throw badRequest("Provide the new administrator's name and an initial password.");
    if (await User.exists({ username: adminUsername.toLowerCase() })) throw badRequest(`Username ${adminUsername} is taken.`);
    if (adminEmail && (await User.exists({ email: adminEmail }))) throw badRequest(`Email ${adminEmail} is already registered.`);
  }

  const college = await College.create({
    ...data,
    code,
    slug: await uniqueSlug(data.name),
    enabledModules: data.enabledModules ?? MODULE_KEYS,
    status: "pending_setup",
  });

  let adminUser = existingAdmin;
  if (existingAdmin) {
    existingAdmin.roles.push({ role: "college_admin", college: college._id });
    await existingAdmin.save();
  } else if (adminUsername && adminName && adminPassword) {
    adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      username: adminUsername.toLowerCase(),
      passwordHash: await hashPassword(adminPassword),
      roles: [{ role: "college_admin", college: college._id }],
      mustChangePassword: true,
    });
  }
  await audit(auth, "create_college", "College", college._id, { code, admin: adminUser?.username }, college._id);
  return json({ item: college }, 201);
});
