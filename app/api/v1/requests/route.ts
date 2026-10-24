import { z } from "zod";
import { audit, badRequest, getAuth, getOwnStudent, handler, json, parseBody, requireCollegeRole, requireModule, zs } from "@/lib/api";
import { ServiceRequest } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  requireModule(auth, "requests");
  const query: Record<string, unknown> = {};
  if (auth.has("registrar", "college_admin")) {
    query.college = requireCollegeRole(auth);
    const status = req.nextUrl.searchParams.get("status");
    if (status) query.status = status;
  } else {
    query.student = (await getOwnStudent(auth))._id;
  }
  const items = await ServiceRequest.find(query)
    .populate("student", "studentId firstName lastName")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  return json({ items });
});

const schema = z.object({
  type: z.enum(["transcript", "enrollment_verification", "clearance", "graduation", "other"]),
  details: zs.str(1000),
});

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  requireModule(auth, "requests");
  const student = await getOwnStudent(auth);
  const data = await parseBody(req, schema);
  if (await ServiceRequest.exists({ student: student._id, type: data.type, status: { $in: ["submitted", "in_progress"] } })) {
    throw badRequest("You already have an open request of this type.");
  }
  const item = await ServiceRequest.create({ ...data, college: student.college, student: student._id });
  await audit(auth, "create_request", "ServiceRequest", item._id, { type: data.type });
  return json({ item }, 201);
});
