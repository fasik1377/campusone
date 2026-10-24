// Shared between server and client: role names, module keys, grading defaults.

export const ROLE_LABELS = {
  college_admin: "College Admin",
  registrar: "Registrar",
  admissions_officer: "Admissions Officer",
  dean: "Dean",
  department_head: "Department Head",
  instructor: "Instructor",
  finance_officer: "Finance Officer",
  student: "Student",
} as const;

export type Role = keyof typeof ROLE_LABELS;
export const ROLES = Object.keys(ROLE_LABELS) as Role[];
export const STAFF_ROLES = ROLES.filter((r) => r !== "student");

export const MODULE_LABELS = {
  admissions: "Admissions",
  registration: "Course Registration",
  attendance: "Attendance",
  grading: "Examination & Grading",
  timetable: "Timetable",
  finance: "Fees & Finance",
  requests: "Student Services",
  announcements: "Announcements",
} as const;

export type ModuleKey = keyof typeof MODULE_LABELS;
export const MODULE_KEYS = Object.keys(MODULE_LABELS) as ModuleKey[];

export const COLLEGE_STATUSES = ["pending_setup", "active", "suspended", "archived"] as const;
export const STUDENT_STATUSES = ["active", "on_leave", "suspended", "withdrawn", "graduated"] as const;
export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "info_required",
  "accepted",
  "rejected",
  "waitlisted",
] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type GradeBand = { letter: string; min: number; points: number };

export const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { letter: "A+", min: 90, points: 4 },
  { letter: "A", min: 85, points: 4 },
  { letter: "A-", min: 80, points: 3.75 },
  { letter: "B+", min: 75, points: 3.5 },
  { letter: "B", min: 70, points: 3 },
  { letter: "B-", min: 65, points: 2.75 },
  { letter: "C+", min: 60, points: 2.5 },
  { letter: "C", min: 50, points: 2 },
  { letter: "C-", min: 45, points: 1.75 },
  { letter: "D", min: 40, points: 1 },
  { letter: "F", min: 0, points: 0 },
];

export const DEFAULT_ASSESSMENTS = [
  { name: "Continuous Assessment", weight: 30 },
  { name: "Midterm", weight: 20 },
  { name: "Final Exam", weight: 50 },
];

export function gradeFor(total: number, scale: GradeBand[] = DEFAULT_GRADING_SCALE) {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  const band = sorted.find((b) => total >= b.min) ?? sorted[sorted.length - 1];
  return { letter: band.letter, points: band.points };
}

export function formatMoney(minor: number, currency = "ETB") {
  return `${currency} ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
