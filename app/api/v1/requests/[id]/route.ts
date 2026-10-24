import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { ServiceRequest } from "@/lib/models";

const schema = z.object({ status: z.enum(["in_progress", "completed", "rejected"]), response: zs.str(1000) });

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar");
  const item = await ServiceRequest.findOne({ _id: toId((await params).id, "Request"), college });
  if (!item) throw notFound("Request");
  const data = await parseBody(req, schema);
  if (item.status === "completed" || item.status === "rejected") throw badRequest(`This request is already ${item.status}.`);
  if (data.status === "rejected" && !data.response) throw badRequest("Explain to the student why the request was rejected.");
  item.set({ ...data, handledBy: auth.user.name });
  await item.save();
  await audit(auth, `request_${data.status}`, "ServiceRequest", item._id, data);
  return json({ item });
});
