import { getAuth, handler, json } from "@/lib/api";
import { College } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const collegeIds = [...new Set(auth.user.roles.map((r) => String(r.college)))];
  const colleges = await College.find({ _id: { $in: collegeIds } }).select("name code status logoFileId enabledModules").lean();
  return json({
    user: {
      id: auth.userId,
      name: auth.user.name,
      email: auth.user.email,
      username: auth.user.username,
      isSuperAdmin: auth.isSuperAdmin,
      mustChangePassword: auth.user.mustChangePassword,
    },
    roles: auth.roles,
    college: auth.college ? colleges.find((c) => String(c._id) === String(auth.collegeId)) : null,
    collegeBlocked: auth.collegeBlocked,
    colleges,
  });
});
