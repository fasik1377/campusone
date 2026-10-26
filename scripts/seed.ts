/**
 * Seeds CampusOne with the Super Admin and Africa Beza College. Each step only runs if its data is missing.
 *   npm run seed                    -> Super Admin + Africa Beza College
 *   npm run seed -- --demo          -> also two demo colleges with sample staff, students and grades
 *   npm run seed -- --reset         -> DROPS the database first, then seeds
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

const SUPER_ADMIN = {
  username: (process.env.SEED_ADMIN_USERNAME ?? "fasikabera1@gmail.com").toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD ?? "CampusOne@2026",
};
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

  await ensureSuperAdmin();
  if (process.argv.includes("--demo")) {
    if (await College.exists({ code: "ATC" })) console.log("Demo colleges already exist — skipping.");
    else await seedDemo();
  }
  await ensureAfricaBeza();
}

async function ensureSuperAdmin() {
  if (await User.exists({ isSuperAdmin: true })) {
    console.log("A Super Admin already exists — skipping.");
    return;
  }
  await User.create({
    name: "Fasika Abera",
    username: SUPER_ADMIN.username,
    email: SUPER_ADMIN.username.includes("@") ? SUPER_ADMIN.username : undefined,
    passwordHash: await hash(SUPER_ADMIN.password),
    isSuperAdmin: true,
  });
  console.log(`\nSuper Admin created — username: ${SUPER_ADMIN.username}  password: ${SUPER_ADMIN.password}`);
}

/** Stores a file from /public in GridFS as a public college logo, the same way an upload would. */
async function uploadLogo(path: string, filename: string, contentType: string, college: mongoose.Types.ObjectId) {
  const { readFile } = await import("fs/promises");
  const data = await readFile(path);
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "uploads" });
  const stream = bucket.openUploadStream(filename, { metadata: { kind: "logo", college, public: true, contentType } });
  await new Promise<void>((resolve, reject) => {
    stream.once("finish", () => resolve());
    stream.once("error", reject);
    stream.end(data);
  });
  return stream.id as mongoose.Types.ObjectId;
}

/** Africa Beza College: added on every run if missing, so existing databases get it too. */
async function ensureAfricaBeza() {
  if (await College.exists({ code: "ABC" })) {
    console.log("Africa Beza College already exists — skipping.");
    return;
  }
  const abc = await College.create({
    name: "Africa Beza College",
    code: "ABC",
    slug: "africa-beza-college",
    tagline: "Lighting the way to knowledge, skills and service",
    description:
      "Africa Beza College prepares graduates in business, health sciences and computing through practical, community-focused education. Explore our programs below and apply online.",
    address: "Ethiopia",
    coverImage: "/africa_beza2.jpg",
    brandColor: "#1E8E3E",
    status: "active",
    enabledModules: MODULE_KEYS,
    gradingScale: DEFAULT_GRADING_SCALE,
  });
  abc.logoFileId = await uploadLogo("public/africa_beza.jpg", "africa_beza.jpg", "image/jpeg", abc._id);
  await abc.save();

  const [be, hs, it] = await Department.create([
    { college: abc._id, name: "Business and Economics", code: "BE", description: "Accounting, finance and management." },
    { college: abc._id, name: "Health Sciences", code: "HS", description: "Nursing and public health." },
    { college: abc._id, name: "Computer Science and IT", code: "CSIT", description: "Software, networks and information systems." },
  ]);
  await Program.create([
    { college: abc._id, department: be._id, name: "BA in Accounting and Finance", code: "ACFN", level: "Degree", durationYears: 3, totalCredits: 110, description: "Financial reporting, auditing, taxation and corporate finance.", admissionRequirements: "Secondary school leaving certificate, transcript and national ID.", admissionOpen: true },
    { college: abc._id, department: be._id, name: "BA in Management", code: "MGMT", level: "Degree", durationYears: 3, totalCredits: 110, description: "Leadership, operations, marketing and entrepreneurship.", admissionRequirements: "Secondary school leaving certificate, transcript and national ID.", admissionOpen: true },
    { college: abc._id, department: hs._id, name: "BSc in Nursing", code: "NURS", level: "Degree", durationYears: 4, totalCredits: 140, description: "Clinical nursing practice, community health and patient care.", admissionRequirements: "Secondary school certificate with passes in Biology and Chemistry; transcript and national ID.", admissionOpen: true },
    { college: abc._id, department: it._id, name: "BSc in Computer Science", code: "BSCS", level: "Degree", durationYears: 4, totalCredits: 130, description: "Programming, databases, networking and software engineering.", admissionRequirements: "Secondary school certificate with a pass in Mathematics; transcript and national ID.", admissionOpen: true },
  ]);
  const courses = await Course.create([
    { college: abc._id, department: be._id, code: "ACFN101", title: "Principles of Accounting I", credits: 3 },
    { college: abc._id, department: be._id, code: "MGMT101", title: "Introduction to Management", credits: 3 },
    { college: abc._id, department: hs._id, code: "NURS101", title: "Fundamentals of Nursing", credits: 4 },
    { college: abc._id, department: hs._id, code: "ANAT101", title: "Human Anatomy", credits: 3 },
    { college: abc._id, department: it._id, code: "CS101", title: "Introduction to Computing", credits: 3 },
    { college: abc._id, department: it._id, code: "CS111", title: "Programming Fundamentals", credits: 4 },
  ]);

  const staff = async (name: string, username: string, role: string) =>
    User.create({ name, username, passwordHash: await hash(STAFF_PASSWORD), roles: [{ role, college: abc._id }] });
  await staff("Africa Beza Administrator", "abc.admin", "college_admin");
  await staff("Africa Beza Registrar", "abc.registrar", "registrar");
  const instructor = await staff("Africa Beza Instructor", "abc.instructor", "instructor");
  await staff("Africa Beza Finance Officer", "abc.finance", "finance_officer");

  const semester = await Semester.create({ college: abc._id, name: "Semester I", academicYear: "2026/27", startDate: new Date("2026-09-14"), endDate: new Date("2027-01-22"), isCurrent: true, registrationOpen: true });
  const slots = [
    [{ day: "Mon", start: "08:00", end: "10:00", room: "R101" }],
    [{ day: "Tue", start: "08:00", end: "10:00", room: "R101" }],
    [{ day: "Mon", start: "10:30", end: "12:30", room: "Skills Lab" }],
    [{ day: "Wed", start: "08:00", end: "10:00", room: "R102" }],
    [{ day: "Thu", start: "08:00", end: "10:00", room: "Computer Lab" }],
    [{ day: "Fri", start: "08:00", end: "11:00", room: "Computer Lab" }],
  ];
  await Section.create(courses.map((c, i) => ({ college: abc._id, course: c._id, semester: semester._id, name: "A", instructor: instructor._id, capacity: 50, schedule: slots[i] })));
  await Announcement.create({ college: abc._id, title: "Admissions open for 2026/27", body: "Africa Beza College is accepting applications for all programs. Apply online through CampusOne.", audience: [], isPublic: true, createdBy: "Africa Beza Registrar" });

  console.log("\nAfrica Beza College added. Accounts:");
  console.table([
    { role: "College Admin", username: "abc.admin", password: STAFF_PASSWORD },
    { role: "Registrar", username: "abc.registrar", password: STAFF_PASSWORD },
    { role: "Instructor", username: "abc.instructor", password: STAFF_PASSWORD },
    { role: "Finance Officer", username: "abc.finance", password: STAFF_PASSWORD },
  ]);
}

async function seedDemo() {
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

  console.log("\nDemo colleges added. Accounts:");
  console.table([
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
  .catch(async (error) => {
    if (/ServerSelection/.test(error?.name ?? "")) {
      const ip = await fetch("https://api.ipify.org").then((r) => r.text()).catch(() => "unknown");
      console.error(
        `\nCould not connect to MongoDB.\nIf you use MongoDB Atlas: open Network Access → Add IP Address and add ${ip} ` +
          `(or 0.0.0.0/0 if your IP changes often), wait about a minute, then run \`npm run seed\` again.\n`,
      );
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
