import "server-only";
import { z } from "zod";
import { zs } from "./api";
import { College } from "./models";
import { MODULE_KEYS } from "./roles";

export const collegeProfileSchema = z.object({
  name: zs.req(150),
  tagline: zs.str(200),
  description: zs.str(3000),
  email: zs.email,
  phone: zs.str(40),
  address: zs.str(300),
  website: zs.str(200),
  coverImage: zs.str(300),
  brandColor: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1E8E3E").optional()),
  timezone: zs.str(60),
  currency: zs.str(8),
  maxCreditsPerSemester: z.coerce.number().int().min(1).max(60).optional(),
  requireFeeClearance: zs.bool.optional(),
});

export const collegeModulesSchema = z.array(z.enum(MODULE_KEYS as [string, ...string[]]));

export async function uniqueSlug(name: string, excludeId?: unknown) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "college";
  let slug = base;
  for (let i = 2; await College.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${base}-${i}`;
  return slug;
}
