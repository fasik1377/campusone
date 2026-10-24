import { audit, getAuth, handler, json, notFound, parseBody, requireSuperAdmin, toId } from "@/lib/api";
import { collegeModulesSchema, collegeProfileSchema } from "@/lib/colleges";
import { AuditLog, College, Department, Program, Student, User } from "@/lib/models";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const id = toId((await params).id, "College");
  const college = await College.findById(id).lean();
  if (!college) throw notFound("College");
  // Platform admins see aggregate counts and administrators, not individual academic records.
  const [admins, students, staff, departments, programs, activity] = await Promise.all([
    User.find({ roles: { $elemMatch: { college: id, role: "college_admin" } } }).select("name email username status lastLoginAt").lean(),
    Student.countDocuments({ college: id }),
    User.countDocuments({ roles: { $elemMatch: { college: id, role: { $ne: "student" } } } }),
    Department.countDocuments({ college: id }),
    Program.countDocuments({ college: id }),
    AuditLog.find({ college: id }).sort({ createdAt: -1 }).limit(15).select("action entity actorName createdAt").lean(),
  ]);
  return json({ item: college, admins, stats: { students, staff, departments, programs }, activity });
});

const patchSchema = collegeProfileSchema.partial().extend({ enabledModules: collegeModulesSchema.optional() });

export const PATCH = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const college = await College.findById(toId((await params).id, "College"));
  if (!college) throw notFound("College");
  const data = await parseBody(req, patchSchema);
  college.set(data);
  await college.save();
  await audit(auth, "update_college", "College", college._id, data, college._id);
  return json({ item: college });
});
