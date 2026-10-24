import "server-only";
import type { Model, PopulateOptions } from "mongoose";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, requireModule, toId, type Auth } from "./api";
import type { Role } from "./roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModel = Model<any>;

export type CrudOptions = {
  model: AnyModel;
  entity: string;
  read: Role[];
  write: Role[];
  schema: z.ZodObject<any>;
  /** Referenced fields that must belong to the caller's college (tenant isolation). */
  refs?: Record<string, AnyModel>;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
  sort?: Record<string, 1 | -1>;
  /** Fields searched by ?q= */
  search?: string[];
  /** Query-string keys allowed as exact-match filters, e.g. ?semester=... */
  filters?: string[];
  /** Field limiting deans / department heads to their own departments. */
  departmentField?: string;
  module?: string;
  deleteGuards?: { model: AnyModel; field: string; label: string }[];
  beforeSave?: (data: Record<string, any>, auth: Auth, existing?: any) => Promise<void>;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function verifyRefs(o: CrudOptions, data: Record<string, any>, college: unknown) {
  for (const [field, refModel] of Object.entries(o.refs ?? {})) {
    const value = data[field];
    if (value === undefined || value === null) continue;
    const ids = Array.isArray(value) ? value : [value];
    if (!ids.length) continue;
    const count = await refModel.countDocuments({ _id: { $in: ids }, college });
    if (count !== new Set(ids.map(String)).size) throw badRequest(`Invalid ${field}: not found in your college.`);
  }
}

function scopeQuery(o: CrudOptions, auth: Auth, base: Record<string, any>) {
  const leadershipOnly = !auth.has("college_admin", "registrar", "admissions_officer", "finance_officer");
  if (o.departmentField && leadershipOnly && auth.departmentIds.length) {
    base[o.departmentField] = { $in: auth.departmentIds };
  }
  return base;
}

export function collectionRoutes(o: CrudOptions) {
  const GET = handler(async (req: NextRequest) => {
    const auth = await getAuth(req);
    const college = requireCollegeRole(auth, ...o.read);
    if (o.module) requireModule(auth, o.module);
    const params = req.nextUrl.searchParams;
    const query: Record<string, any> = scopeQuery(o, auth, { college });
    for (const key of o.filters ?? []) {
      const value = params.get(key);
      if (value) query[key] = value;
    }
    const q = params.get("q")?.trim();
    if (q && o.search?.length) {
      query.$or = o.search.map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } }));
    }
    const limit = Math.min(Number(params.get("limit")) || 500, 2000);
    const items = await o.model
      .find(query)
      .sort(o.sort ?? { createdAt: -1 })
      .limit(limit)
      .populate((o.populate ?? []) as any)
      .lean();
    return json({ items });
  });

  const POST = handler(async (req: NextRequest) => {
    const auth = await getAuth(req);
    const college = requireCollegeRole(auth, ...o.write);
    if (o.module) requireModule(auth, o.module);
    const data = (await parseBody(req, o.schema)) as Record<string, any>;
    await verifyRefs(o, data, college);
    await o.beforeSave?.(data, auth);
    const doc = await o.model.create({ ...data, college });
    await audit(auth, "create", o.entity, doc._id, { ...data });
    return json({ item: doc }, 201);
  });

  return { GET, POST };
}

export function itemRoutes(o: CrudOptions) {
  type P = { id: string };

  const GET = handler<P>(async (req, { params }) => {
    const auth = await getAuth(req);
    const college = requireCollegeRole(auth, ...o.read);
    const { id } = await params;
    const item = await o.model
      .findOne(scopeQuery(o, auth, { _id: toId(id), college }))
      .populate((o.populate ?? []) as any)
      .lean();
    if (!item) throw notFound(o.entity);
    return json({ item });
  });

  const PATCH = handler<P>(async (req, { params }) => {
    const auth = await getAuth(req);
    const college = requireCollegeRole(auth, ...o.write);
    const { id } = await params;
    const existing = await o.model.findOne({ _id: toId(id), college });
    if (!existing) throw notFound(o.entity);
    const data = (await parseBody(req, o.schema.partial())) as Record<string, any>;
    await verifyRefs(o, data, college);
    await o.beforeSave?.(data, auth, existing);
    existing.set(data);
    await existing.save();
    await audit(auth, "update", o.entity, existing._id, data);
    return json({ item: existing });
  });

  const DELETE = handler<P>(async (req, { params }) => {
    const auth = await getAuth(req);
    const college = requireCollegeRole(auth, ...o.write);
    const { id } = await params;
    const _id = toId(id);
    for (const guard of o.deleteGuards ?? []) {
      if (await guard.model.exists({ [guard.field]: _id, college })) {
        throw badRequest(`Cannot delete: this ${o.entity.toLowerCase()} is still used by ${guard.label}.`);
      }
    }
    const deleted = await o.model.findOneAndDelete({ _id, college });
    if (!deleted) throw notFound(o.entity);
    await audit(auth, "delete", o.entity, _id);
    return json({ ok: true });
  });

  return { GET, PATCH, DELETE };
}
