import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import type { Types } from "mongoose";
import { badRequest } from "./api";
import { College, GradeEntry, nextSequence, Program, Student, User } from "./models";
import { gradeFor, type GradeBand } from "./roles";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function temporaryPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let out = "";
  for (let i = 0; i < 7; i++) out += letters[randomInt(letters.length)];
  for (let i = 0; i < 3; i++) out += digits[randomInt(digits.length)];
  return out;
}

export async function generateStudentId(collegeId: Types.ObjectId) {
  const college = await College.findById(collegeId).select("code").lean();
  const seq = await nextSequence(`student:${collegeId}`);
  const year = String(new Date().getFullYear()).slice(-2);
  return `${college?.code ?? "STU"}-${String(seq).padStart(4, "0")}-${year}`;
}

export type NewStudentInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  program: Types.ObjectId | string;
  cohort?: string;
  studyMode?: string;
  studentId?: string;
  /** Admin-chosen login; defaults to the student ID and a generated temporary password. */
  username?: string;
  password?: string;
  mustChangePassword?: boolean;
  application?: Types.ObjectId;
};

/** Creates the official student record and a login account. Returns the temporary password once. */
export async function createStudentWithAccount(college: Types.ObjectId, input: NewStudentInput) {
  const program = await Program.findOne({ _id: input.program, college }).lean();
  if (!program) throw badRequest("Program not found in this college.");
  const studentId = input.studentId?.trim() || (await generateStudentId(college));
  if (await Student.exists({ college, studentId })) throw badRequest(`Student ID ${studentId} already exists.`);

  const username = input.username?.trim().toLowerCase() || studentId.toLowerCase();
  if (await User.exists({ username })) throw badRequest(`Username ${username} is already taken.`);
  const email = input.email?.trim().toLowerCase() || undefined;
  if (email && (await User.exists({ email }))) throw badRequest(`A user with email ${email} already exists.`);

  const password = input.password || temporaryPassword();
  const user = await User.create({
    name: `${input.firstName} ${input.lastName}`.trim(),
    email,
    username,
    passwordHash: await hashPassword(password),
    roles: [{ role: "student", college }],
    mustChangePassword: input.mustChangePassword ?? true,
  });
  try {
    const student = await Student.create({
      college,
      user: user._id,
      studentId,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      program: program._id,
      department: program.department,
      cohort: input.cohort ?? String(new Date().getFullYear()),
      studyMode: input.studyMode ?? "Regular",
      application: input.application,
      statusHistory: [{ status: "active", reason: "Admitted", by: "system", at: new Date() }],
    });
    return { student, username, password };
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}

export type Assessment = { name: string; weight: number };

/** Validates component scores against weights and computes the total and letter grade. */
export function computeGrade(
  scores: Record<string, number | null | undefined>,
  assessments: Assessment[],
  scale: GradeBand[],
  studentLabel = "student",
) {
  const clean: Record<string, number> = {};
  for (const a of assessments) {
    const raw = scores[a.name];
    if (raw === undefined || raw === null || Number.isNaN(raw)) continue;
    const value = Number(raw);
    if (value < 0 || value > a.weight) {
      throw badRequest(`${studentLabel}: ${a.name} must be between 0 and ${a.weight} (got ${value}).`);
    }
    clean[a.name] = Math.round(value * 100) / 100;
  }
  const complete = assessments.every((a) => clean[a.name] !== undefined);
  const total = Math.round(Object.values(clean).reduce((s, v) => s + v, 0) * 100) / 100;
  const grade = complete ? gradeFor(total, scale) : { letter: undefined, points: undefined };
  return { scores: clean, total, complete, ...grade };
}

/** Published results with GPA per semester and cumulative. */
export async function transcriptFor(studentId: Types.ObjectId) {
  const entries = await GradeEntry.find({ student: studentId, published: true })
    .populate("course", "code title credits")
    .populate("semester", "name academicYear startDate")
    .lean();
  type Row = { course: { code: string; title: string; credits: number }; semester: { _id: unknown; name: string; academicYear: string; startDate?: Date }; total?: number | null; letter?: string | null; points?: number | null };
  const rows = entries as unknown as Row[];
  const bySemester = new Map<string, { semester: Row["semester"]; rows: Row[] }>();
  for (const row of rows) {
    const key = String(row.semester?._id);
    if (!bySemester.has(key)) bySemester.set(key, { semester: row.semester, rows: [] });
    bySemester.get(key)!.rows.push(row);
  }
  let cumPoints = 0;
  let cumCredits = 0;
  let earned = 0;
  const semesters = [...bySemester.values()]
    .sort((a, b) => +new Date(a.semester?.startDate ?? 0) - +new Date(b.semester?.startDate ?? 0))
    .map(({ semester, rows }) => {
      let points = 0;
      let credits = 0;
      for (const r of rows) {
        points += (r.points ?? 0) * r.course.credits;
        credits += r.course.credits;
        if (r.letter && r.letter !== "F") earned += r.course.credits;
      }
      cumPoints += points;
      cumCredits += credits;
      return {
        semester: `${semester?.name} ${semester?.academicYear}`,
        courses: rows.map((r) => ({ code: r.course.code, title: r.course.title, credits: r.course.credits, total: r.total, letter: r.letter, points: r.points })),
        gpa: credits ? +(points / credits).toFixed(2) : 0,
        cgpa: cumCredits ? +(cumPoints / cumCredits).toFixed(2) : 0,
      };
    });
  return {
    semesters,
    cgpa: cumCredits ? +(cumPoints / cumCredits).toFixed(2) : 0,
    creditsAttempted: cumCredits,
    creditsEarned: earned,
  };
}

export function standingFor(cgpa: number, credits: number) {
  if (!credits) return "New";
  if (cgpa >= 3.5) return "Distinction";
  if (cgpa >= 2) return "Good Standing";
  if (cgpa >= 1.75) return "Academic Warning";
  return "Probation";
}
