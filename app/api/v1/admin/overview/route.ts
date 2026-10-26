import mongoose from "mongoose";
import { getAuth, handler, json, requireSuperAdmin } from "@/lib/api";
import { Application, AuditLog, College, Program, Student, User } from "@/lib/models";

const DAY = 864e5;

/** Counts per calendar day (UTC) for `days` days ending today, zero-filled. */
async function perDay(model: mongoose.Model<any>, match: Record<string, unknown>, from: Date, days: number) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = await model.aggregate<{ _id: string; n: number }>([
    { $match: { ...match, createdAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * DAY).toISOString().slice(0, 10);
    return map.get(d) ?? 0;
  });
}

const count = (model: mongoose.Model<any>, match: Record<string, unknown>, from: Date, to: Date) => // eslint-disable-line @typescript-eslint/no-explicit-any
  model.countDocuments({ ...match, createdAt: { $gte: from, $lt: to } });

/** Platform-wide analytics for the Super Admin dashboard. Aggregates only — no individual academic records. */
export const GET = handler(async (req) => {
  requireSuperAdmin(await getAuth(req));
  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days"))) ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const from = new Date(today.getTime() - (days - 1) * DAY);
  const prevFrom = new Date(from.getTime() - days * DAY);
  const now = new Date();

  const pingStart = Date.now();
  await mongoose.connection.db!.admin().ping();
  const dbLatency = Date.now() - pingStart;

  const [
    signIns, otherActions, newUsers, newApplications,
    signInsPrev, newUsersPrev, applicationsPrev, signInsCur, newUsersCur, applicationsCur,
    usersByRole, totalUsers, activeUsers, mustChange, disabled, superAdmins,
    colleges, studentsByCollege, staffByCollege, programsByCollege, pendingByCollege, lastActivity,
    applicationsByStatus, recent, files,
  ] = await Promise.all([
    perDay(AuditLog, { action: "login" }, from, days),
    perDay(AuditLog, { action: { $ne: "login" } }, from, days),
    perDay(User, {}, from, days),
    perDay(Application, {}, from, days),
    count(AuditLog, { action: "login" }, prevFrom, from),
    count(User, {}, prevFrom, from),
    count(Application, {}, prevFrom, from),
    count(AuditLog, { action: "login" }, from, now),
    count(User, {}, from, now),
    count(Application, {}, from, now),
    User.aggregate<{ _id: string; n: number }>([
      { $match: { status: "active" } },
      { $unwind: "$roles" },
      { $group: { _id: { role: "$roles.role", u: "$_id" } } },
      { $group: { _id: "$_id.role", n: { $sum: 1 } } },
    ]),
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "active", mustChangePassword: true }),
    User.countDocuments({ status: "disabled" }),
    User.countDocuments({ isSuperAdmin: true }),
    College.find().select("name code slug status logoFileId brandColor createdAt").sort({ status: 1, name: 1 }).lean(),
    Student.aggregate<{ _id: unknown; n: number }>([{ $match: { status: "active" } }, { $group: { _id: "$college", n: { $sum: 1 } } }]),
    User.aggregate<{ _id: unknown; n: number }>([
      { $unwind: "$roles" },
      { $match: { "roles.role": { $ne: "student" } } },
      { $group: { _id: { c: "$roles.college", u: "$_id" } } },
      { $group: { _id: "$_id.c", n: { $sum: 1 } } },
    ]),
    Program.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$college", n: { $sum: 1 } } }]),
    Application.aggregate<{ _id: unknown; n: number }>([
      { $match: { status: { $in: ["submitted", "under_review", "info_required"] } } },
      { $group: { _id: "$college", n: { $sum: 1 } } },
    ]),
    AuditLog.aggregate<{ _id: unknown; at: Date }>([{ $group: { _id: "$college", at: { $max: "$createdAt" } } }]),
    Application.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    AuditLog.find().sort({ createdAt: -1 }).limit(12).select("action entity actorName createdAt college").populate("college", "code name").lean(),
    mongoose.connection.db!.collection("uploads.files").aggregate<{ n: number; bytes: number }>([{ $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: "$length" } } }]).toArray(),
  ]);

  const pick = (rows: { _id: unknown; n: number }[], id: unknown) => rows.find((r) => String(r._id) === String(id))?.n ?? 0;
  const dates = Array.from({ length: days }, (_, i) => new Date(from.getTime() + i * DAY).toISOString().slice(0, 10));
  const status = (s: string) => colleges.filter((c) => c.status === s).length;

  return json({
    days,
    dates,
    series: { signIns, otherActions, newUsers, newApplications },
    period: {
      signIns: { current: signInsCur, previous: signInsPrev },
      newUsers: { current: newUsersCur, previous: newUsersPrev },
      applications: { current: applicationsCur, previous: applicationsPrev },
    },
    totals: {
      users: totalUsers,
      activeUsers,
      superAdmins,
      mustChange,
      disabled,
      colleges: { active: status("active"), pending_setup: status("pending_setup"), suspended: status("suspended"), archived: status("archived") },
    },
    usersByRole: usersByRole.sort((a, b) => b.n - a.n).map((r) => ({ role: r._id, count: r.n })),
    applicationsByStatus: Object.fromEntries(applicationsByStatus.map((r) => [r._id, r.n])),
    colleges: colleges.map((c) => ({
      ...c,
      students: pick(studentsByCollege, c._id),
      staff: pick(staffByCollege, c._id),
      programs: pick(programsByCollege, c._id),
      pendingApplications: pick(pendingByCollege, c._id),
      lastActivity: lastActivity.find((r) => String(r._id) === String(c._id))?.at ?? null,
    })),
    health: { dbLatency, files: files[0]?.n ?? 0, fileBytes: files[0]?.bytes ?? 0, checkedAt: now },
    recent,
  });
});
