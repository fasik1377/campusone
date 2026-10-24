import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError, audit, handler, json, parseBody } from "@/lib/api";
import { College, User } from "@/lib/models";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const schema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });

// Simple in-memory throttle: 8 failed attempts per identifier+IP per 15 minutes.
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;

export const POST = handler(async (req) => {
  const { identifier, password } = await parseBody(req, schema);
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

  // Prefer a college that is not suspended when the user belongs to several.
  const collegeIds = [...new Set(user.roles.map((r) => String(r.college)))];
  const usable = collegeIds.length
    ? await College.find({ _id: { $in: collegeIds }, status: { $in: ["active", "pending_setup"] } }).select("_id").lean()
    : [];
  const cid = usable[0] ? String(usable[0]._id) : collegeIds[0] ?? null;

  user.lastLoginAt = new Date();
  await user.save();
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: String(user._id), cid }), sessionCookieOptions());
  await audit(null, "login", "User", user._id, { username: user.username }, cid ? (usable[0]?._id as never) : null);
  return json({ ok: true, mustChangePassword: user.mustChangePassword });
});
