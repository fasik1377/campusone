import { badRequest, handler, json, notFound } from "@/lib/api";
import { Application } from "@/lib/models";

// Requires both the application number and the applicant's email, so numbers alone reveal nothing.
export const GET = handler(async (req) => {
  const number = req.nextUrl.searchParams.get("number")?.trim().toUpperCase();
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!number || !email) throw badRequest("Enter your application number and email.");
  const app = await Application.findOne({ applicationNumber: number, email })
    .select("applicationNumber firstName status history createdAt program college")
    .populate("program", "name")
    .populate("college", "name")
    .lean();
  if (!app) throw notFound("Application");
  const latestNote = [...(app.history ?? [])].reverse().find((h) => h.by !== "applicant" && h.note)?.note;
  return json({
    applicationNumber: app.applicationNumber,
    firstName: app.firstName,
    status: app.status,
    program: (app.program as unknown as { name: string })?.name,
    college: (app.college as unknown as { name: string })?.name,
    submittedAt: app.createdAt,
    message: app.status === "info_required" || app.status === "accepted" || app.status === "rejected" ? latestNote : undefined,
  });
});
