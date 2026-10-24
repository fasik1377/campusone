import "server-only";
import { z } from "zod";
import { badRequest, zs } from "./api";
import type { CrudOptions } from "./crud";
import { Course, Department, Program, Registration, Section, Semester, Student, User } from "./models";
import { DAYS } from "./roles";

const leadership = ["college_admin", "registrar", "dean", "department_head"] as const;

export const departments: CrudOptions = {
  model: Department,
  entity: "Department",
  read: [...leadership, "instructor", "admissions_officer", "finance_officer"],
  write: ["college_admin"],
  schema: z.object({ name: zs.req(150), code: zs.req(12), description: zs.str(1000) }),
  sort: { name: 1 },
  search: ["name", "code"],
  deleteGuards: [
    { model: Program, field: "department", label: "programs" },
    { model: Course, field: "department", label: "courses" },
  ],
};

export const programs: CrudOptions = {
  model: Program,
  entity: "Program",
  read: [...leadership, "instructor", "admissions_officer", "finance_officer"],
  write: ["college_admin"],
  schema: z.object({
    department: zs.id,
    name: zs.req(150),
    code: zs.req(16),
    level: zs.str(40),
    durationYears: z.coerce.number().min(0.5).max(10),
    totalCredits: z.coerce.number().int().min(1).max(400),
    minGpa: z.coerce.number().min(0).max(4).optional(),
    description: zs.str(2000),
    admissionRequirements: zs.str(2000),
    admissionOpen: zs.bool,
  }),
  refs: { department: Department },
  populate: { path: "department", select: "name code" },
  sort: { name: 1 },
  search: ["name", "code"],
  filters: ["department"],
  departmentField: "department",
  deleteGuards: [{ model: Student, field: "program", label: "students" }],
};

export const courses: CrudOptions = {
  model: Course,
  entity: "Course",
  read: [...leadership, "instructor", "student"],
  write: ["college_admin", "department_head"],
  schema: z.object({
    department: zs.id,
    code: zs.req(16),
    title: zs.req(150),
    credits: z.coerce.number().min(0).max(30),
    description: zs.str(2000),
    prerequisites: z.array(zs.id).default([]),
  }),
  refs: { department: Department, prerequisites: Course },
  populate: [
    { path: "department", select: "name code" },
    { path: "prerequisites", select: "code title" },
  ],
  sort: { code: 1 },
  search: ["code", "title"],
  filters: ["department"],
  departmentField: "department",
  deleteGuards: [{ model: Section, field: "course", label: "course sections" }],
  async beforeSave(data, auth, existing) {
    // Department heads may only manage courses in their own department.
    if (!auth.has("college_admin") && auth.departmentIds.length) {
      const dept = data.department ?? existing?.department;
      if (!auth.departmentIds.some((d) => String(d) === String(dept))) throw badRequest("You can only manage courses in your department.");
    }
    if (existing && data.prerequisites?.some((p: string) => String(p) === String(existing._id))) {
      throw badRequest("A course cannot be its own prerequisite.");
    }
  },
};

export const semesters: CrudOptions = {
  model: Semester,
  entity: "Semester",
  read: [...leadership, "instructor", "student", "finance_officer", "admissions_officer"],
  write: ["college_admin", "registrar"],
  schema: z.object({
    name: zs.req(60),
    academicYear: zs.req(20),
    startDate: zs.date,
    endDate: zs.date,
    registrationOpen: zs.bool,
    isCurrent: zs.bool,
  }),
  sort: { startDate: -1 },
  deleteGuards: [{ model: Section, field: "semester", label: "course sections" }],
  async beforeSave(data, auth, existing) {
    if (data.isCurrent) {
      await Semester.updateMany({ college: auth.collegeId, _id: { $ne: existing?._id } }, { isCurrent: false });
    }
  },
};

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const scheduleItem = z
  .object({ day: z.enum(DAYS), start: z.string().regex(timeRe, "Use HH:MM"), end: z.string().regex(timeRe, "Use HH:MM"), room: zs.str(40) })
  .refine((s) => s.start < s.end, "Class end time must be after start time");

const overlaps = (a: { day: string; start: string; end: string }, b: { day: string; start: string; end: string }) =>
  a.day === b.day && a.start < b.end && b.start < a.end;

export const sections: CrudOptions = {
  model: Section,
  entity: "Section",
  read: [...leadership, "instructor", "student"],
  write: ["college_admin", "department_head", "registrar"],
  schema: z.object({
    course: zs.id,
    semester: zs.id,
    name: zs.req(20),
    instructor: zs.optId,
    capacity: z.coerce.number().int().min(1).max(1000),
    schedule: z.array(scheduleItem).default([]),
    assessments: z
      .array(z.object({ name: zs.req(60), weight: z.coerce.number().min(1).max(100) }))
      .optional()
      .refine((a) => !a || a.reduce((s, x) => s + x.weight, 0) === 100, "Assessment weights must add up to 100"),
  }),
  refs: { course: Course, semester: Semester },
  populate: [
    { path: "course", select: "code title credits department" },
    { path: "semester", select: "name academicYear registrationOpen isCurrent" },
    { path: "instructor", select: "name" },
  ],
  sort: { createdAt: -1 },
  filters: ["semester", "course", "instructor"],
  deleteGuards: [{ model: Registration, field: "section", label: "student registrations" }],
  async beforeSave(data, auth, existing) {
    const college = auth.collegeId;
    const instructor = data.instructor ?? existing?.instructor;
    if (data.instructor && !(await User.exists({ _id: data.instructor, roles: { $elemMatch: { college, role: "instructor" } } }))) {
      throw badRequest("The selected instructor does not have the Instructor role in this college.");
    }
    if (existing && data.assessments && existing.gradeStatus !== "open" && existing.gradeStatus !== "returned") {
      throw badRequest("Assessment weights cannot change after grades were submitted.");
    }
    const semester = data.semester ?? existing?.semester;
    const schedule: { day: string; start: string; end: string; room?: string }[] = data.schedule ?? existing?.schedule ?? [];
    if (!schedule.length) return;
    // Detect room and instructor timetable conflicts within the same semester.
    const others = await Section.find({ college, semester, _id: { $ne: existing?._id } })
      .populate("course", "code")
      .lean();
    for (const other of others) {
      for (const a of schedule) {
        for (const b of other.schedule ?? []) {
          if (!overlaps(a, b as typeof a)) continue;
          const label = `${(other.course as unknown as { code: string })?.code} section ${other.name}`;
          if (a.room && b.room && a.room.toLowerCase() === b.room.toLowerCase()) {
            throw badRequest(`Room ${a.room} is already booked on ${a.day} ${b.start}-${b.end} by ${label}.`);
          }
          if (instructor && String(other.instructor) === String(instructor)) {
            throw badRequest(`The instructor already teaches ${label} on ${a.day} ${b.start}-${b.end}.`);
          }
        }
      }
    }
  },
};
