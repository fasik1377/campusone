import { z } from "zod";
import { audit, badRequest, forbidden, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { createStudentWithAccount } from "@/lib/academics";
import { Application } from "@/lib/models";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "admissions_officer", "college_admin");
  const item = await Application.findOne({ _id: toId((await params).id, "Application"), college })
    .populate("program", "name code admissionRequirements")
    .populate("student", "studentId")
    .lean();
  if (!item) throw notFound("Application");
  return json({ item });
});

const schema = z.object({
  action: z.enum(["under_review", "info_required", "waitlisted", "rejected", "accepted"]),
  note: zs.str(1000),
  cohort: zs.str(20),
  studyMode: zs.str(30),
});

// Admissions officers screen and recommend; only the registrar admits or rejects.
const OFFICER_ACTIONS = ["under_review", "info_required", "waitlisted"];

export const POST = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "registrar", "admissions_officer");
  const app = await Application.findOne({ _id: toId((await params).id, "Application"), college });
  if (!app) throw notFound("Application");
  const { action, note, cohort, studyMode } = await parseBody(req, schema);
  if (!auth.has("registrar") && !OFFICER_ACTIONS.includes(action)) {
    throw forbidden("Only the registrar can accept or reject applications.");
  }
  if (app.status === "accepted" || app.status === "rejected") throw badRequest(`This application was already ${app.status}.`);
  if ((action === "rejected" || action === "info_required") && !note) {
    throw badRequest("Please add a note explaining the decision to the applicant.");
  }

  let credentials;
  if (action === "accepted") {
    // Converts the applicant into an official student without re-entering their data.
    const created = await createStudentWithAccount(college, {
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone ?? undefined,
      gender: app.gender ?? undefined,
      dateOfBirth: app.dateOfBirth ?? undefined,
      address: app.address ?? undefined,
      program: app.program,
      cohort,
      studyMode,
      application: app._id,
    });
    app.student = created.student._id;
    credentials = { studentId: created.student.studentId, username: created.username, password: created.password };
  }
  app.status = action;
  app.history.push({ status: action, note, by: auth.user.name, at: new Date() });
  await app.save();
  await audit(auth, `application_${action}`, "Application", app._id, { applicationNumber: app.applicationNumber, note });
  return json({ ok: true, credentials });
});
