import { z } from "zod";
import { audit, getAuth, handler, json, notFound, parseBody, requireCollegeRole } from "@/lib/api";
import { collegeProfileSchema } from "@/lib/colleges";
import { College } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth);
  const item = await College.findById(college).lean();
  if (!item) throw notFound("College");
  return json({ item });
});

const gradeBand = z.object({ letter: z.string().trim().min(1).max(4), min: z.coerce.number().min(0).max(100), points: z.coerce.number().min(0).max(5) });

// College admins edit their own profile and academic policy; module availability and status stay with the Super Admin.
const schema = collegeProfileSchema.partial().extend({
  gradingScale: z
    .array(gradeBand)
    .min(2)
    .refine((s) => s.some((b) => b.min === 0), "The grading scale needs a band starting at 0")
    .optional(),
});

export const PATCH = handler(async (req) => {
  const auth = await getAuth(req);
  const collegeId = requireCollegeRole(auth, "college_admin");
  const college = await College.findById(collegeId);
  if (!college) throw notFound("College");
  const data = await parseBody(req, schema);
  college.set(data);
  await college.save();
  await audit(auth, "update_college_settings", "College", college._id, data);
  return json({ item: college });
});
