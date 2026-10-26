import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { AuditLog, College, User } from "@/lib/models";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const schema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
  // Set when signing in from a college's own page: the account must belong to that college.
  college: z.string().trim().max(80).optional(),
});

// Simple in-memory throttle: 8 failed attempts per identifier+IP per 15 minutes.
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;

export const POST = handler(async (req) => {
  const { identifier, password, college: collegeSlug } = await parseBody(req, schema);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${identifier.toLowerCase()}`;
  const entry = attempts.get(key);
  if (entry && entry.until > Date.now() && entry.count >= 8) {
    throw new ApiError(429, "Too many failed attempts. Please wait 15 minutes and try again.");
  }

  const user = await User.findOne({
    $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
  }).select("+passwordHash");
  const valid = user && user.status === "active" && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) {
    const current = entry && entry.until > Date.now() ? entry : { count: 0, until: Date.now() + WINDOW };
    attempts.set(key, { count: current.count + 1, until: current.until });
    throw new ApiError(401, user?.status === "disabled" ? "This account has been disabled." : "Incorrect username or password.");
  }
  attempts.delete(key);

  const collegeIds = [...new Set(user.roles.map((r) => String(r.college)))];
  let cid: string | null;
  if (collegeSlug) {
    const target = await College.findOne({ slug: collegeSlug.toLowerCase() }).select("_id name status").lean();
    if (!target) throw new ApiError(404, "College not found.");
    if (!collegeIds.includes(String(target._id)) && !user.isSuperAdmin) {
      throw new ApiError(403, `This account is not registered at ${target.name}. Contact the college administrator.`);
    }
    if (target.status === "suspended" || target.status === "archived") {
      throw new ApiError(403, `${target.name} is currently ${target.status}. Please contact the platform administrator.`);
    }
    cid = collegeIds.includes(String(target._id)) ? String(target._id) : null;
  } else {
    // Prefer a college that is not suspended when the user belongs to several.
    const usable = collegeIds.length
      ? await College.find({ _id: { $in: collegeIds }, status: { $in: ["active", "pending_setup"] } }).select("_id").lean()
      : [];
    cid = usable[0] ? String(usable[0]._id) : (collegeIds[0] ?? null);
  }

  user.lastLoginAt = new Date();
  await user.save();
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: String(user._id), cid }), sessionCookieOptions());
  // Logged directly so the activity feed shows who signed in rather than "system".
  await AuditLog.create({ actor: user._id, actorName: user.name, action: "login", entity: "User", entityId: String(user._id), college: cid ? new Types.ObjectId(cid) : undefined, details: { username: user.username } });
  return json({ ok: true, mustChangePassword: user.mustChangePassword, home: user.mustChangePassword ? "/portal/account" : "/portal" });
});
