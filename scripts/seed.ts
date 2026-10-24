/**
 * Seeds CampusOne with a Super Admin and two demo colleges.
 *   npm run seed            -> creates data only if it does not exist yet
 *   npm run seed -- --reset -> DROPS the database first, then seeds
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  Announcement,
  Application,
  Attendance,
  College,
  Course,
  Department,
  GradeEntry,
  Invoice,
  Program,
  Registration,
  Section,
  Semester,
  Student,
  User,
} from "../lib/models";
import { DEFAULT_ASSESSMENTS, DEFAULT_GRADING_SCALE, gradeFor, MODULE_KEYS } from "../lib/roles";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall back to variables already in the environment.
}

const SUPER_ADMIN = { username: "superadmin", password: process.env.SEED_ADMIN_PASSWORD ?? "CampusOne@2026" };
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "Campus@2026";
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD ?? "Student@2026";

const hash = (p: string) => bcrypt.hash(p, 12);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing (.env.local)");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  if (process.argv.includes("--reset")) {
    await mongoose.connection.dropDatabase();
    console.log("Database dropped.");
  }
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  if (await User.exists({ username: SUPER_ADMIN.username })) {
    console.log("Super admin already exists — skipping seed. Use `npm run seed -- --reset` to start over.");
    return;
  }

  await User.create({ name: "Platform Administrator", username: SUPER_ADMIN.username, email: "admin@campusone.local", passwordHash: await hash(SUPER_ADMIN.password), isSuperAdmin: true });

  /* ------------------------------ College 1 ------------------------------ */
  const atc = await College.create({
    name: "Addis Tech College",
    code: "ATC",
    slug: "addis-tech-college",
    tagline: "Technology and business education for a connected Ethiopia",
    description: "Addis Tech College offers accredited degree programs in computing and business, with modern labs and industry partnerships.",
    email: "info@addistech.edu.et",
    phone: "+251 11 555 0100",
    address: "Bole, Addis Ababa",
    website: "addistech.edu.et",
    status: "active",
    enabledModules: MODULE_KEYS,
    gradingScale: DEFAULT_GRADING_SCALE,
  });

  const [cs, bus] = await Department.create([
    { college: atc._id, name: "Computer Science", code: "CS", description: "Software, systems and data." },
    { college: atc._id, name: "Business Administration", code: "BUS", description: "Management, accounting and entrepreneurship." },
  ]);
  const [bscCs, baBus] = await Program.create([
    { college: atc._id, department: cs._id, name: "BSc in Computer Science", code: "BSCS", level: "Degree", durationYears: 4, totalCredits: 130, description: "Programming, algorithms, databases, networks and software engineering.", admissionRequirements: "Ethiopian Secondary School Leaving Certificate with a pass in Mathematics; transcript and national ID.", admissionOpen: true },
    { college: atc._id, department: bus._id, name: "BA in Business Administration", code: "BABA", level: "Degree", durationYears: 3, totalCredits: 110, description: "Management, marketing, finance and entrepreneurship.", admissionRequirements: "Secondary school certificate; transcript and national ID.", admissionOpen: true },
  ]);

  const cs101 = await Course.create({ college: atc._id, department: cs._id, code: "CS101", title: "Introduction to Programming", credits: 3 });
  const math101 = await Course.create({ college: atc._id, department: cs._id, code: "MATH101", title: "Calculus I", credits: 4 });
  const cs102 = await Course.create({ college: atc._id, department: cs._id, code: "CS102", title: "Object-Oriented Programming", credits: 3, prerequisites: [cs101._id] });
  const cs201 = await Course.create({ college: atc._id, department: cs._id, code: "CS201", title: "Data Structures and Algorithms", credits: 4, prerequisites: [cs102._id] });
  const bus101 = await Course.create({ college: atc._id, department: bus._id, code: "BUS101", title: "Principles of Management", credits: 3 });
  await Course.create({ college: atc._id, department: bus._id, code: "ACC101", title: "Financial Accounting I", credits: 3 });

  const staff = async (name: string, username: string, roles: { role: string; department?: mongoose.Types.ObjectId }[]) =>
    User.create({ name, username, email: `${username}@addistech.edu.et`, passwordHash: await hash(STAFF_PASSWORD), roles: roles.map((r) => ({ ...r, college: atc._id })) });

  await staff("Selam Tesfaye", "atc.admin", [{ role: "college_admin" }]);
  await staff("Dawit Bekele", "atc.registrar", [{ role: "registrar" }]);
  await staff("Hanna Girma", "atc.admissions", [{ role: "admissions_officer" }]);
  await staff("Prof. Yonas Alemu", "atc.dean", [{ role: "dean" }]);
  const head = await staff("Dr. Meron Haile", "atc.cshead", [{ role: "department_head", department: cs._id }, { role: "instructor" }]);
  const instructor = await staff("Abel Kebede", "atc.instructor", [{ role: "instructor" }]);
  await staff("Tigist Worku", "atc.finance", [{ role: "finance_officer" }]);

  const previous = await Semester.create({ college: atc._id, name: "Semester II", academicYear: "2025/26", startDate: new Date("2026-02-09"), endDate: new Date("2026-06-26") });
  const current = await Semester.create({ college: atc._id, name: "Semester I", academicYear: "2026/27", startDate: new Date("2026-09-14"), endDate: new Date("2027-01-22"), isCurrent: true, registrationOpen: true });

  const prevCs101 = await Section.create({ college: atc._id, course: cs101._id, semester: previous._id, name: "A", instructor: instructor._id, capacity: 40, schedule: [{ day: "Mon", start: "08:00", end: "10:00", room: "Lab 1" }], gradeStatus: "published" });
  const prevMath = await Section.create({ college: atc._id, course: math101._id, semester: previous._id, name: "A", instructor: head._id, capacity: 40, schedule: [{ day: "Tue", start: "08:00", end: "10:00", room: "B201" }], gradeStatus: "published" });
  const secCs102 = await Section.create({ college: atc._id, course: cs102._id, semester: current._id, name: "A", instructor: instructor._id, capacity: 35, schedule: [{ day: "Mon", start: "08:00", end: "10:00", room: "Lab 1" }, { day: "Wed", start: "08:00", end: "09:30", room: "Lab 1" }] });
  await Section.create({ college: atc._id, course: cs101._id, semester: current._id, name: "A", instructor: instructor._id, capacity: 40, schedule: [{ day: "Tue", start: "10:30", end: "12:30", room: "Lab 2" }, { day: "Thu", start: "10:30", end: "12:00", room: "Lab 2" }] });
  await Section.create({ college: atc._id, course: cs201._id, semester: current._id, name: "A", instructor: head._id, capacity: 30, schedule: [{ day: "Thu", start: "14:00", end: "16:00", room: "B105" }] });
  const secBus = await Section.create({ college: atc._id, course: bus101._id, semester: current._id, name: "A", capacity: 50, schedule: [{ day: "Fri", start: "09:00", end: "11:00", room: "B201" }] });

  const studentUser = async (name: string, username: string, email: string) =>
    User.create({ name, username, email, passwordHash: await hash(STUDENT_PASSWORD), roles: [{ role: "student", college: atc._id }] });
  const u1 = await studentUser("Liya Mekonnen", "atc-0001-26", "liya.mekonnen@student.addistech.edu.et");
  const u2 = await studentUser("Samuel Tadesse", "atc-0002-26", "samuel.tadesse@student.addistech.edu.et");
  const u3 = await studentUser("Ruth Assefa", "atc-0003-26", "ruth.assefa@student.addistech.edu.et");
  const [s1, s2, s3] = await Student.create([
    { college: atc._id, user: u1._id, studentId: "ATC-0001-26", firstName: "Liya", lastName: "Mekonnen", email: u1.email, phone: "+251 91 100 0001", gender: "Female", program: bscCs._id, department: cs._id, cohort: "2026", statusHistory: [{ status: "active", reason: "Admitted", by: "seed", at: new Date() }] },
    { college: atc._id, user: u2._id, studentId: "ATC-0002-26", firstName: "Samuel", lastName: "Tadesse", email: u2.email, phone: "+251 91 100 0002", gender: "Male", program: bscCs._id, department: cs._id, cohort: "2026", statusHistory: [{ status: "active", reason: "Admitted", by: "seed", at: new Date() }] },
    { college: atc._id, user: u3._id, studentId: "ATC-0003-26", firstName: "Ruth", lastName: "Assefa", email: u3.email, phone: "+251 91 100 0003", gender: "Female", program: baBus._id, department: bus._id, cohort: "2026", statusHistory: [{ status: "active", reason: "Admitted", by: "seed", at: new Date() }] },
  ]);
  // Keep generated student IDs after the seeded ones.
  await mongoose.connection.collection("counters").updateOne({ key: `student:${atc._id}` }, { $set: { seq: 3 } }, { upsert: true });

  // Previous semester: approved registrations with published grades.
  const marks: [typeof s1, typeof prevCs101, number[]][] = [
    [s1, prevCs101, [27, 17, 44]],
    [s1, prevMath, [24, 15, 38]],
    [s2, prevCs101, [20, 12, 30]],
    [s2, prevMath, [12, 8, 15]],
  ];
  for (const [student, section, [ca, mid, fin]] of marks) {
    const course = section.course;
    await Registration.create({ college: atc._id, student: student._id, section: section._id, course, semester: previous._id, status: "approved", decidedBy: "Dawit Bekele", decidedAt: new Date("2026-02-12") });
    const total = ca + mid + fin;
    const g = gradeFor(total);
    await GradeEntry.create({ college: atc._id, section: section._id, student: student._id, course, semester: previous._id, scores: { [DEFAULT_ASSESSMENTS[0].name]: ca, [DEFAULT_ASSESSMENTS[1].name]: mid, [DEFAULT_ASSESSMENTS[2].name]: fin }, total, letter: g.letter, points: g.points, published: true });
  }

  // Current semester: Liya and Samuel approved in CS102 (they passed CS101); Ruth pending in BUS101.
  await Registration.create([
    { college: atc._id, student: s1._id, section: secCs102._id, course: cs102._id, semester: current._id, status: "approved", decidedBy: "Dawit Bekele", decidedAt: new Date() },
    { college: atc._id, student: s2._id, section: secCs102._id, course: cs102._id, semester: current._id, status: "approved", decidedBy: "Dawit Bekele", decidedAt: new Date() },
    { college: atc._id, student: s3._id, section: secBus._id, course: bus101._id, semester: current._id, status: "pending" },
  ]);
  await Attendance.create({
    college: atc._id,
    section: secCs102._id,
    date: "2026-10-19",
    records: [{ student: s1._id, status: "present" }, { student: s2._id, status: "late" }],
    recordedBy: "Abel Kebede",
  });

  let inv = 0;
  for (const s of [s1, s2, s3]) {
    inv++;
    await Invoice.create({ college: atc._id, student: s._id, invoiceNumber: `INV-ATC-${String(inv).padStart(6, "0")}`, description: "Tuition fee — Semester I 2026/27", amount: 1250000, currency: "ETB", dueDate: new Date("2026-11-30"), createdBy: "Tigist Worku" });
  }
  await mongoose.connection.collection("counters").updateOne({ key: `invoice:${atc._id}` }, { $set: { seq: inv } }, { upsert: true });

  await Application.create({
    college: atc._id,
    program: bscCs._id,
    applicationNumber: "APP-ATC-2026-00001",
    firstName: "Nahom",
    lastName: "Getachew",
    email: "nahom.getachew@example.com",
    phone: "+251 92 200 0001",
    gender: "Male",
    previousSchool: "Menelik II Secondary School",
    previousResult: "ESSLCE 520/700",
    statement: "I want to build software that serves Ethiopian businesses.",
    documents: [],
    history: [{ status: "submitted", note: "Application submitted online", by: "applicant", at: new Date() }],
  });
  await mongoose.connection.collection("counters").updateOne({ key: `application:${atc._id}` }, { $set: { seq: 1 } }, { upsert: true });

  await Announcement.create([
    { college: atc._id, title: "Semester I registration is open", body: "Registration and add/drop for Semester I 2026/27 is open until 31 October. Register from the Course registration page.", audience: [], isPublic: true, createdBy: "Dawit Bekele" },
    { college: atc._id, title: "Grade submission deadline", body: "Instructors: submit Semester I mark sheets by 29 January 2027.", audience: ["instructor", "department_head"], createdBy: "Selam Tesfaye" },
    { title: "Welcome to CampusOne", body: "CampusOne is now live. Contact your college registrar if you cannot sign in.", audience: [], createdBy: "Platform Administrator" },
  ]);

  /* ------------------------------ College 2 ------------------------------ */
  const bdp = await College.create({
    name: "Bahir Dar Polytechnic",
    code: "BDP",
    slug: "bahir-dar-polytechnic",
    tagline: "Hands-on engineering and technical training",
    description: "Diploma programs in electrical, mechanical and construction technology.",
    email: "info@bdpoly.edu.et",
    phone: "+251 58 220 0200",
    address: "Bahir Dar",
    status: "active",
  });
  const ee = await Department.create({ college: bdp._id, name: "Electrical Technology", code: "EE" });
  await Program.create({ college: bdp._id, department: ee._id, name: "Diploma in Electrical Installation", code: "DEI", level: "Diploma", durationYears: 2, totalCredits: 70, admissionOpen: true, admissionRequirements: "Grade 10 completion certificate." });
  await User.create({ name: "Kebede Ayele", username: "bdp.admin", email: "admin@bdpoly.edu.et", passwordHash: await hash(STAFF_PASSWORD), roles: [{ role: "college_admin", college: bdp._id }] });

  console.log("\nSeed complete. Accounts:");
  console.table([
    { role: "Super Admin", username: SUPER_ADMIN.username, password: SUPER_ADMIN.password },
    { role: "College Admin (ATC)", username: "atc.admin", password: STAFF_PASSWORD },
    { role: "Registrar (ATC)", username: "atc.registrar", password: STAFF_PASSWORD },
    { role: "Admissions Officer (ATC)", username: "atc.admissions", password: STAFF_PASSWORD },
    { role: "Dean (ATC)", username: "atc.dean", password: STAFF_PASSWORD },
    { role: "Dept Head + Instructor (ATC CS)", username: "atc.cshead", password: STAFF_PASSWORD },
    { role: "Instructor (ATC)", username: "atc.instructor", password: STAFF_PASSWORD },
    { role: "Finance Officer (ATC)", username: "atc.finance", password: STAFF_PASSWORD },
    { role: "Student (ATC)", username: "atc-0001-26", password: STUDENT_PASSWORD },
    { role: "College Admin (BDP)", username: "bdp.admin", password: STAFF_PASSWORD },
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
