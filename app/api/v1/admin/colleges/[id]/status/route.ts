import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireSuperAdmin, toId } from "@/lib/api";
import { College } from "@/lib/models";
import { COLLEGE_STATUSES } from "@/lib/roles";

const schema = z.object({ status: z.enum(COLLEGE_STATUSES), reason: z.string().trim().max(500).optional() });

// Status changes never delete academic records; suspension only blocks college users from the portal.
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const college = await College.findById(toId((await params).id, "College"));
  if (!college) throw notFound("College");
  const { status, reason } = await parseBody(req, schema);
  if ((status === "suspended" || status === "archived") && !reason) {
    throw badRequest("A reason is required to suspend or archive a college.");
  }
  const previous = college.status;
  college.status = status;
  college.statusReason = reason;
  await college.save();
  await audit(auth, `college_${status}`, "College", college._id, { from: previous, to: status, reason }, college._id);
  return json({ item: college });
});
