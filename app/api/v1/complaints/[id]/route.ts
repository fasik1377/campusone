import { z } from "zod";
import { audit, badRequest, forbidden, getAuth, handler, json, parseBody, zs } from "@/lib/api";
import { loadComplaint } from "@/lib/complaints";

type P = { id: string };

/** Full complaint with its thread; for grade appeals, the grade itself is included. */
export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { complaint, asStudent, canDecide } = await loadComplaint(auth, (await params).id);
  // Opening the thread clears the reader's unread marker.
  if (asStudent && complaint.studentUnread) complaint.studentUnread = false;
  if (!asStudent && complaint.staffUnread) complaint.staffUnread = false;
  if (complaint.isModified()) await complaint.save();
  await complaint.populate([
    { path: "student", select: "studentId firstName lastName email program", populate: { path: "program", select: "name code" } },
    { path: "course", select: "code title credits" },
    { path: "section", select: "name instructor", populate: { path: "instructor", select: "name" } },
    { path: "gradeEntry", select: "scores total letter points published history semester", populate: { path: "semester", select: "name academicYear" } },
  ]);
  return json({ item: complaint, asStudent, canDecide });
});

const replySchema = z.object({ body: zs.req(3000) });

/** Add a message to the thread (student or staff). */
export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { complaint, asStudent } = await loadComplaint(auth, (await params).id);
  if (complaint.status === "resolved" || complaint.status === "rejected") {
    throw badRequest("This complaint is closed. Submit a new one if the problem continues.");
  }
  const { body } = await parseBody(req, replySchema);
  complaint.messages.push({ by: auth.userId, byName: auth.user.name, fromStudent: asStudent, body, at: new Date() });
  if (asStudent) complaint.staffUnread = true;
  else {
    complaint.studentUnread = true;
    // A staff reply moves a new complaint into review.
    if (complaint.status === "submitted") complaint.status = "under_review";
  }
  await complaint.save();
  await audit(auth, "reply_complaint", "Complaint", complaint._id, { ticket: complaint.ticketNumber });
  return json({ ok: true });
});

const decideSchema = z.object({ status: z.enum(["under_review", "resolved", "rejected"]), resolution: zs.str(2000) });

/** Registrar / College Admin moves the complaint along and records the outcome. */
export const PATCH = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { complaint, canDecide } = await loadComplaint(auth, (await params).id);
  if (!canDecide) throw forbidden("Only the registrar or college administrator can change a complaint's status.");
  const { status, resolution } = await parseBody(req, decideSchema);
  if ((status === "resolved" || status === "rejected") && !resolution) throw badRequest("Explain the outcome to the student.");
  if (complaint.status === "resolved" || complaint.status === "rejected") throw badRequest(`This complaint is already ${complaint.status}.`);
  complaint.status = status;
  if (status !== "under_review") {
    complaint.resolution = resolution;
    complaint.resolvedBy = auth.user.name;
    complaint.resolvedAt = new Date();
    complaint.messages.push({ by: auth.userId, byName: auth.user.name, fromStudent: false, body: `${status === "resolved" ? "Resolved" : "Closed without change"}: ${resolution}`, at: new Date() });
  }
  complaint.studentUnread = true;
  await complaint.save();
  await audit(auth, `complaint_${status}`, "Complaint", complaint._id, { ticket: complaint.ticketNumber, resolution });
  return json({ ok: true });
});
