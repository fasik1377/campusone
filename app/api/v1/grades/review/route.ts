import { getAuth, handler, json, requireCollegeRole, requireModule } from "@/lib/api";
import { Course, Section } from "@/lib/models";

/** Sections waiting on the caller in the grade approval workflow. */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "department_head", "dean", "college_admin");
  requireModule(auth, "grading");
  const query: Record<string, unknown> = { college };
  const status = req.nextUrl.searchParams.get("status");
  if (status) query.gradeStatus = status;
  else query.gradeStatus = { $in: ["submitted", "approved", "returned", "published"] };
  if (!auth.has("registrar", "college_admin") && auth.departmentIds.length) {
    query.course = { $in: await Course.find({ college, department: { $in: auth.departmentIds } }).distinct("_id") };
  }
  const items = await Section.find(query)
    .populate("course", "code title credits")
    .populate("semester", "name academicYear")
    .populate("instructor", "name")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();
  return json({ items });
});
