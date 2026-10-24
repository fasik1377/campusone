import mongoose, { Schema, model, models, type Model } from "mongoose";
import {
  APPLICATION_STATUSES,
  ATTENDANCE_STATUSES,
  COLLEGE_STATUSES,
  DAYS,
  DEFAULT_ASSESSMENTS,
  DEFAULT_GRADING_SCALE,
  MODULE_KEYS,
  ROLES,
  STUDENT_STATUSES,
} from "./roles";

const ref = Schema.Types.ObjectId;
const tenant = { type: ref, ref: "College", required: true, index: true } as const;

function define<T extends Schema>(name: string, schema: T) {
  // Reuse the compiled model across hot reloads in development.
  return (models[name] as Model<mongoose.InferSchemaType<T>>) ?? model(name, schema);
}

/* ---------------------------------- Platform ---------------------------------- */

const College = define(
  "College",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, unique: true, uppercase: true, trim: true },
      slug: { type: String, required: true, unique: true },
      tagline: String,
      description: String,
      email: String,
      phone: String,
      address: String,
      website: String,
      logoFileId: { type: ref },
      status: { type: String, enum: COLLEGE_STATUSES, default: "pending_setup" },
      statusReason: String,
      enabledModules: { type: [String], default: () => [...MODULE_KEYS] },
      timezone: { type: String, default: "Africa/Addis_Ababa" },
      currency: { type: String, default: "ETB" },
      maxCreditsPerSemester: { type: Number, default: 24 },
      requireFeeClearance: { type: Boolean, default: false },
      gradingScale: {
        type: [new Schema({ letter: String, min: Number, points: Number }, { _id: false })],
        default: () => DEFAULT_GRADING_SCALE,
      },
    },
    { timestamps: true },
  ),
);

const User = define(
  "User",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
      username: { type: String, required: true, lowercase: true, trim: true, unique: true },
      passwordHash: { type: String, required: true, select: false },
      isSuperAdmin: { type: Boolean, default: false },
      roles: [
        new Schema(
          {
            role: { type: String, enum: ROLES, required: true },
            college: { type: ref, ref: "College", required: true },
            department: { type: ref, ref: "Department" },
          },
          { _id: false },
        ),
      ],
      status: { type: String, enum: ["active", "disabled"], default: "active" },
      mustChangePassword: { type: Boolean, default: false },
      lastLoginAt: Date,
    },
    { timestamps: true },
  ),
);

const AuditLog = define(
  "AuditLog",
  new Schema(
    {
      actor: { type: ref, ref: "User" },
      actorName: String,
      action: { type: String, required: true },
      entity: String,
      entityId: String,
      college: { type: ref, ref: "College", index: true },
      details: Schema.Types.Mixed,
      ip: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ),
);

const Counter = define(
  "Counter",
  new Schema({ key: { type: String, unique: true }, seq: { type: Number, default: 0 } }),
);

export async function nextSequence(key: string) {
  const doc = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return doc!.seq;
}

/* ------------------------------ Academic structure ----------------------------- */

const Department = define(
  "Department",
  new Schema(
    { college: tenant, name: { type: String, required: true }, code: { type: String, required: true, uppercase: true }, description: String },
    { timestamps: true },
  ).index({ college: 1, code: 1 }, { unique: true }),
);

const Program = define(
  "Program",
  new Schema(
    {
      college: tenant,
      department: { type: ref, ref: "Department", required: true },
      name: { type: String, required: true },
      code: { type: String, required: true, uppercase: true },
      level: { type: String, default: "Degree" },
      durationYears: { type: Number, default: 4 },
      totalCredits: { type: Number, default: 120 },
      minGpa: { type: Number, default: 2 },
      description: String,
      admissionRequirements: String,
      admissionOpen: { type: Boolean, default: true },
    },
    { timestamps: true },
  ).index({ college: 1, code: 1 }, { unique: true }),
);

const Course = define(
  "Course",
  new Schema(
    {
      college: tenant,
      department: { type: ref, ref: "Department", required: true },
      code: { type: String, required: true, uppercase: true },
      title: { type: String, required: true },
      credits: { type: Number, required: true, min: 0 },
      description: String,
      prerequisites: [{ type: ref, ref: "Course" }],
    },
    { timestamps: true },
  ).index({ college: 1, code: 1 }, { unique: true }),
);

const Semester = define(
  "Semester",
  new Schema(
    {
      college: tenant,
      name: { type: String, required: true },
      academicYear: { type: String, required: true },
      startDate: Date,
      endDate: Date,
      registrationOpen: { type: Boolean, default: false },
      isCurrent: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);

const Section = define(
  "Section",
  new Schema(
    {
      college: tenant,
      course: { type: ref, ref: "Course", required: true },
      semester: { type: ref, ref: "Semester", required: true },
      name: { type: String, default: "A" },
      instructor: { type: ref, ref: "User" },
      capacity: { type: Number, default: 40 },
      schedule: [
        new Schema(
          { day: { type: String, enum: DAYS }, start: String, end: String, room: String },
          { _id: false },
        ),
      ],
      assessments: {
        type: [new Schema({ name: String, weight: Number }, { _id: false })],
        default: () => DEFAULT_ASSESSMENTS,
      },
      gradeStatus: {
        type: String,
        enum: ["open", "submitted", "approved", "published", "returned"],
        default: "open",
      },
      gradeLog: [
        new Schema({ action: String, by: { type: ref, ref: "User" }, byName: String, note: String, at: Date }, { _id: false }),
      ],
    },
    { timestamps: true },
  ),
);

/* ------------------------------ Students & admissions -------------------------- */

const Student = define(
  "Student",
  new Schema(
    {
      college: tenant,
      user: { type: ref, ref: "User" },
      studentId: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: String,
      phone: String,
      gender: String,
      dateOfBirth: Date,
      address: String,
      emergencyContactName: String,
      emergencyContactPhone: String,
      program: { type: ref, ref: "Program", required: true },
      department: { type: ref, ref: "Department", required: true },
      cohort: String,
      studyMode: { type: String, default: "Regular" },
      status: { type: String, enum: STUDENT_STATUSES, default: "active" },
      admissionDate: { type: Date, default: Date.now },
      application: { type: ref, ref: "Application" },
      statusHistory: [
        new Schema({ status: String, reason: String, by: String, at: Date }, { _id: false }),
      ],
    },
    { timestamps: true },
  ).index({ college: 1, studentId: 1 }, { unique: true }),
);

const Application = define(
  "Application",
  new Schema(
    {
      college: tenant,
      program: { type: ref, ref: "Program", required: true },
      applicationNumber: { type: String, required: true, unique: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: String,
      gender: String,
      dateOfBirth: Date,
      address: String,
      previousSchool: String,
      previousResult: String,
      statement: String,
      documents: [
        new Schema({ fileId: ref, name: String, contentType: String, size: Number }, { _id: false }),
      ],
      status: { type: String, enum: APPLICATION_STATUSES, default: "submitted" },
      history: [
        new Schema({ status: String, note: String, by: String, at: Date }, { _id: false }),
      ],
      student: { type: ref, ref: "Student" },
    },
    { timestamps: true },
  ),
);

/* ------------------------------ Academic operations ---------------------------- */

const Registration = define(
  "Registration",
  new Schema(
    {
      college: tenant,
      student: { type: ref, ref: "Student", required: true },
      section: { type: ref, ref: "Section", required: true },
      course: { type: ref, ref: "Course", required: true },
      semester: { type: ref, ref: "Semester", required: true },
      status: { type: String, enum: ["pending", "approved", "rejected", "dropped"], default: "pending" },
      note: String,
      decidedBy: String,
      decidedAt: Date,
    },
    { timestamps: true },
  ).index({ student: 1, section: 1 }, { unique: true }),
);

const GradeEntry = define(
  "GradeEntry",
  new Schema(
    {
      college: tenant,
      section: { type: ref, ref: "Section", required: true },
      student: { type: ref, ref: "Student", required: true },
      course: { type: ref, ref: "Course", required: true },
      semester: { type: ref, ref: "Semester", required: true },
      scores: { type: Map, of: Number, default: {} },
      total: Number,
      letter: String,
      points: Number,
      published: { type: Boolean, default: false },
      history: [
        new Schema(
          { scores: Schema.Types.Mixed, total: Number, letter: String, by: String, reason: String, at: Date },
          { _id: false },
        ),
      ],
    },
    { timestamps: true },
  ).index({ section: 1, student: 1 }, { unique: true }),
);

const Attendance = define(
  "Attendance",
  new Schema(
    {
      college: tenant,
      section: { type: ref, ref: "Section", required: true },
      date: { type: String, required: true }, // YYYY-MM-DD in the college time zone
      records: [
        new Schema(
          { student: { type: ref, ref: "Student" }, status: { type: String, enum: ATTENDANCE_STATUSES } },
          { _id: false },
        ),
      ],
      recordedBy: String,
      corrections: [new Schema({ by: String, at: Date }, { _id: false })],
    },
    { timestamps: true },
  ).index({ section: 1, date: 1 }, { unique: true }),
);

/* ------------------------------ Finance & services ----------------------------- */

const Invoice = define(
  "Invoice",
  new Schema(
    {
      college: tenant,
      student: { type: ref, ref: "Student", required: true },
      invoiceNumber: { type: String, required: true, unique: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 }, // minor units (cents)
      paidAmount: { type: Number, default: 0 },
      currency: { type: String, default: "ETB" },
      dueDate: Date,
      status: { type: String, enum: ["unpaid", "partial", "paid", "cancelled"], default: "unpaid" },
      createdBy: String,
    },
    { timestamps: true },
  ),
);

const Payment = define(
  "Payment",
  new Schema(
    {
      college: tenant,
      invoice: { type: ref, ref: "Invoice", required: true },
      student: { type: ref, ref: "Student", required: true },
      amount: { type: Number, required: true, min: 1 },
      method: { type: String, enum: ["cash", "bank_transfer", "mobile_money", "other"], default: "cash" },
      reference: String,
      receiptNumber: { type: String, required: true, unique: true },
      recordedBy: String,
      paidAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  ),
);

const Announcement = define(
  "Announcement",
  new Schema(
    {
      college: { type: ref, ref: "College", index: true }, // empty = platform-wide
      title: { type: String, required: true },
      body: { type: String, required: true },
      audience: { type: [String], default: [] }, // empty = everyone
      isPublic: { type: Boolean, default: false },
      createdBy: String,
    },
    { timestamps: true },
  ),
);

const ServiceRequest = define(
  "ServiceRequest",
  new Schema(
    {
      college: tenant,
      student: { type: ref, ref: "Student", required: true },
      type: {
        type: String,
        enum: ["transcript", "enrollment_verification", "clearance", "graduation", "other"],
        required: true,
      },
      details: String,
      status: { type: String, enum: ["submitted", "in_progress", "completed", "rejected"], default: "submitted" },
      response: String,
      handledBy: String,
    },
    { timestamps: true },
  ),
);

export {
  College,
  User,
  AuditLog,
  Department,
  Program,
  Course,
  Semester,
  Section,
  Student,
  Application,
  Registration,
  GradeEntry,
  Attendance,
  Invoice,
  Payment,
  Announcement,
  ServiceRequest,
};
