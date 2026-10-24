import { z } from "zod";
import { audit, getAuth, handler, json, parseBody, requireCollegeRole, zs } from "@/lib/api";
import { createStudentWithAccount } from "@/lib/academics";
import { Student } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "college_admin", "dean", "department_head", "finance_officer");
  const params = req.nextUrl.searchParams;
  const query: Record<string, unknown> = { college };
  for (const key of ["status", "program", "department", "cohort"]) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  if (!auth.has("registrar", "college_admin", "finance_officer") && auth.departmentIds.length) {
    query.department = { $in: auth.departmentIds };
  }
  const q = params.get("q")?.trim();
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ studentId: rx }, { firstName: rx }, { lastName: rx }, { email: rx }];
  }
  const items = await Student.find(query)
    .select("studentId firstName lastName email phone gender status cohort studyMode program department")
    .populate("program", "name code")
    .populate("department", "name code")
    .sort({ studentId: 1 })
    .limit(Math.min(Number(params.get("limit")) || 1000, 5000))
    .lean();
  return json({ items });
});

const studentInputSchema = z.object({
  firstName: zs.req(80),
  lastName: zs.req(80),
  email: zs.email,
  phone: zs.str(30),
  gender: zs.str(20),
  dateOfBirth: zs.date,
  address: zs.str(300),
  program: zs.id,
  cohort: zs.str(20),
  studyMode: zs.str(30),
  studentId: zs.str(40),
});

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const data = await parseBody(req, studentInputSchema);
  const created = await createStudentWithAccount(college, data);
  await audit(auth, "create_student", "Student", created.student._id, { studentId: created.student.studentId });
  return json(
    { item: created.student, credentials: { studentId: created.student.studentId, username: created.username, password: created.password } },
    201,
  );
});
