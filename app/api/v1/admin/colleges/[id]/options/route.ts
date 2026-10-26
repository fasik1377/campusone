import { getAuth, handler, json, requireSuperAdmin, toId } from "@/lib/api";
import { Department, Program } from "@/lib/models";

/** Departments and programs of a college, for the Super Admin's user forms (names only). */
export const GET = handler<{ id: string }>(async (req, { params }) => {
  requireSuperAdmin(await getAuth(req));
  const college = toId((await params).id, "College");
  const [departments, programs] = await Promise.all([
    Department.find({ college }).select("name code").sort({ name: 1 }).lean(),
    Program.find({ college }).select("name code").sort({ name: 1 }).lean(),
  ]);
  return json({ departments, programs });
});
