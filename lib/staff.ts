import "server-only";
import { z } from "zod";
import type { Types } from "mongoose";
import { badRequest, zs } from "./api";
import { Department } from "./models";
import { STAFF_ROLES } from "./roles";

export const staffRoleSchema = z.array(
  z.object({ role: z.enum(STAFF_ROLES as [string, ...string[]]), department: zs.optId }),
);

/** Ensures departments belong to the college and scoped roles name one where it matters. */
export async function validateStaffRoles(roles: z.infer<typeof staffRoleSchema>, college: Types.ObjectId) {
  if (!roles.length) throw badRequest("Assign at least one role.");
  const deptIds = roles.map((r) => r.department).filter(Boolean) as string[];
  if (deptIds.length && (await Department.countDocuments({ _id: { $in: deptIds }, college })) !== new Set(deptIds).size) {
    throw badRequest("A selected department does not belong to this college.");
  }
  if (roles.some((r) => r.role === "department_head" && !r.department)) {
    throw badRequest("Department Head roles must specify a department.");
  }
  const seen = new Set<string>();
  return roles
    .filter((r) => {
      const key = `${r.role}:${r.department ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({ role: r.role, college, department: r.department }));
}
