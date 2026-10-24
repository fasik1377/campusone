import "server-only";
import { connection, type NextRequest } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "./db";
import { AuditLog, College, Student, User } from "./models";
import { SESSION_COOKIE, verifySession } from "./session";
import type { Role } from "./roles";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, message, details);
export const forbidden = (message = "You do not have permission to perform this action.") => new ApiError(403, message);
export const notFound = (what = "Record") => new ApiError(404, `${what} not found.`);

type RouteContext<P> = { params: Promise<P> };

/** Wraps a route handler: forces request-time execution, connects to MongoDB, and converts errors to JSON. */
export function handler<P = Record<string, string>>(
  fn: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    // Outside the try: during build this rejects on purpose so Next.js skips prerendering the route.
    await connection();
    try {
      await connectDB();
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    const message = error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    return Response.json({ error: message, details: error.issues }, { status: 400 });
  }
  const mongoError = error as { code?: number; keyValue?: Record<string, unknown>; name?: string; message?: string };
  if (mongoError?.code === 11000) {
    const fields = Object.keys(mongoError.keyValue ?? {}).filter((k) => k !== "college").join(", ");
    return Response.json({ error: `A record with the same ${fields || "value"} already exists.` }, { status: 409 });
  }
  if (mongoError?.name === "ValidationError" || mongoError?.name === "CastError") {
    return Response.json({ error: mongoError.message }, { status: 400 });
  }
  console.error("[api]", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export function toId(value: unknown, what = "Record") {
  if (typeof value !== "string" || !isValidObjectId(value)) throw notFound(what);
  return new Types.ObjectId(value);
}

/* --------------------------------- Auth context -------------------------------- */

export type AuthUser = {
  _id: Types.ObjectId;
  name: string;
  email?: string | null;
  username: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  roles: { role: Role; college: Types.ObjectId; department?: Types.ObjectId | null }[];
};

export type Auth = {
  user: AuthUser;
  userId: Types.ObjectId;
  isSuperAdmin: boolean;
  collegeId: Types.ObjectId | null;
  college: { _id: Types.ObjectId; name: string; status: string; enabledModules: string[] } | null;
  collegeBlocked: boolean;
  roles: Role[];
  /** Departments a dean / department head is limited to. Empty means college-wide. */
  departmentIds: Types.ObjectId[];
  has: (...roles: Role[]) => boolean;
};

export async function getAuth(req: NextRequest, options: { optional?: boolean } = {}): Promise<Auth> {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const user = session
    ? await User.findById(session.uid).select("name email username isSuperAdmin mustChangePassword roles status").lean()
    : null;
  if (!user || user.status !== "active") {
    if (options.optional) return null as unknown as Auth;
    throw new ApiError(401, "Please sign in to continue.");
  }

  const assignments = (user.roles ?? []) as AuthUser["roles"];
  const collegeIds = [...new Set(assignments.map((r) => String(r.college)))];
  const activeId = session?.cid && collegeIds.includes(session.cid) ? session.cid : collegeIds[0];
  const college = activeId
    ? await College.findById(activeId).select("name status enabledModules").lean()
    : null;
  const inCollege = assignments.filter((r) => String(r.college) === activeId);
  // Users of suspended or archived colleges keep their account but lose college access.
  const collegeBlocked = !!college && (college.status === "suspended" || college.status === "archived");
  const roles = collegeBlocked ? [] : [...new Set(inCollege.map((r) => r.role))];
  const departmentIds = inCollege
    .filter((r) => (r.role === "dean" || r.role === "department_head") && r.department)
    .map((r) => r.department as Types.ObjectId);
  // Department scoping only applies when every leadership assignment is department-limited.
  const leadership = inCollege.filter((r) => r.role === "dean" || r.role === "department_head");
  const scopedDepartments = leadership.length && leadership.every((r) => r.department) ? departmentIds : [];

  return {
    user: user as unknown as AuthUser,
    userId: user._id as Types.ObjectId,
    isSuperAdmin: !!user.isSuperAdmin,
    collegeId: college ? (college._id as Types.ObjectId) : null,
    college: college as Auth["college"],
    collegeBlocked,
    roles,
    departmentIds: scopedDepartments,
    has: (...wanted: Role[]) => wanted.some((r) => roles.includes(r)),
  };
}

/** Requires one of the given college roles and returns the tenant id every query must filter on. */
export function requireCollegeRole(auth: Auth, ...roles: Role[]) {
  if (!auth.collegeId || auth.collegeBlocked) throw forbidden("Your college account is not active.");
  if (roles.length && !auth.has(...roles)) throw forbidden();
  return auth.collegeId;
}

export function requireSuperAdmin(auth: Auth) {
  if (!auth.isSuperAdmin) throw forbidden("Only platform administrators can do this.");
}

export function requireModule(auth: Auth, module: string) {
  if (auth.college && !auth.college.enabledModules.includes(module)) {
    throw forbidden("This module is not enabled for your college.");
  }
}

export async function getOwnStudent(auth: Auth) {
  const college = requireCollegeRole(auth, "student");
  const student = await Student.findOne({ user: auth.userId, college });
  if (!student) throw notFound("Student record");
  return student;
}

export async function audit(
  auth: Auth | null,
  action: string,
  entity: string,
  entityId: unknown,
  details?: Record<string, unknown>,
  college?: Types.ObjectId | null,
) {
  await AuditLog.create({
    actor: auth?.userId,
    actorName: auth?.user.name ?? "system",
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    college: college ?? auth?.collegeId ?? undefined,
    details,
  });
}

/* ------------------------------------ Zod ------------------------------------ */

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const zs = {
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference"),
  str: (max = 200) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional()),
  req: (max = 200) => z.string().trim().min(1, "Required").max(max),
  num: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
  bool: z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean()),
  date: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  email: z.preprocess(emptyToUndefined, z.email().toLowerCase().optional()),
  optId: z.preprocess(emptyToUndefined, z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference").optional()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
};

export function excelResponse(buffer: ArrayBuffer | Buffer, filename: string) {
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
