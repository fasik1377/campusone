import { getAuth, handler, json, requireCollegeRole } from "@/lib/api";
import { generateStudentIdPreview } from "@/lib/academics";
import { Student, User } from "@/lib/models";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Before adding a student: lists possible duplicates (same email, or same name and birth date)
 * and whether a chosen username / student ID is free. Also previews the next generated student ID.
 */
export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const p = req.nextUrl.searchParams;
  const email = p.get("email")?.trim().toLowerCase();
  const first = p.get("firstName")?.trim();
  const last = p.get("lastName")?.trim();
  const dob = p.get("dateOfBirth");
  const username = p.get("username")?.trim().toLowerCase();
  const studentId = p.get("studentId")?.trim();

  const or: Record<string, unknown>[] = [];
  if (email) or.push({ email });
  if (first && last) {
    const byName: Record<string, unknown> = { firstName: { $regex: `^${escapeRegex(first)}$`, $options: "i" }, lastName: { $regex: `^${escapeRegex(last)}$`, $options: "i" } };
    if (dob && !Number.isNaN(Date.parse(dob))) byName.dateOfBirth = new Date(dob);
    or.push(byName);
  }
  const matches = or.length
    ? await Student.find({ college, $or: or }).select("studentId firstName lastName email status program").populate("program", "code").limit(5).lean()
    : [];

  return json({
    matches,
    emailTaken: email ? !!(await User.exists({ email })) : false,
    usernameTaken: username ? !!(await User.exists({ username })) : false,
    studentIdTaken: studentId ? !!(await Student.exists({ college, studentId })) : false,
    nextStudentId: await generateStudentIdPreview(college),
  });
});
