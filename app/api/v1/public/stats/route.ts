import { handler, json } from "@/lib/api";
import { College, Course, Department, Program, Student } from "@/lib/models";

/** Aggregate counts for the public home page. Only totals, never individual records. */
export const GET = handler(async () => {
  const active = await College.find({ status: "active" }).distinct("_id");
  const scope = { college: { $in: active } };
  const [programs, departments, courses, students] = await Promise.all([
    Program.countDocuments(scope),
    Department.countDocuments(scope),
    Course.countDocuments(scope),
    Student.countDocuments({ ...scope, status: "active" }),
  ]);
  return json({ colleges: active.length, programs, departments, courses, students });
});
