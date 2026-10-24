import { z } from "zod";
import { audit, badRequest, handler, json, zs } from "@/lib/api";
import { deleteFile, saveFile } from "@/lib/files";
import { Application, College, nextSequence, Program } from "@/lib/models";

const schema = z.object({
  program: zs.id,
  firstName: zs.req(80),
  lastName: zs.req(80),
  email: z.email().toLowerCase(),
  phone: zs.req(30),
  gender: zs.str(20),
  dateOfBirth: zs.date,
  address: zs.str(300),
  previousSchool: zs.req(200),
  previousResult: zs.str(100),
  statement: zs.str(3000),
});

const MAX_DOCUMENTS = 4;

export const POST = handler(async (req) => {
  const form = await req.formData();
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const data = schema.parse(fields);

  const program = await Program.findById(data.program).lean();
  const college = program ? await College.findById(program.college).lean() : null;
  if (!program || !college || college.status !== "active") throw badRequest("This program is not accepting applications.");
  if (!program.admissionOpen || !college.enabledModules.includes("admissions")) {
    throw badRequest("Admissions for this program are currently closed.");
  }
  const duplicate = await Application.exists({
    program: program._id,
    email: data.email,
    status: { $in: ["submitted", "under_review", "info_required", "waitlisted"] },
  });
  if (duplicate) throw badRequest("You already have an application in progress for this program. Check its status instead.");

  const files = form.getAll("documents").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!files.length) throw badRequest("Please upload at least one supporting document (transcript, certificate or ID).");
  if (files.length > MAX_DOCUMENTS) throw badRequest(`Upload at most ${MAX_DOCUMENTS} documents.`);

  const documents = [];
  try {
    for (const file of files) documents.push(await saveFile(file, { kind: "document", college: college._id, public: false }));
  } catch (error) {
    await Promise.all(documents.map((d) => deleteFile(d.fileId)));
    throw error;
  }

  const seq = await nextSequence(`application:${college._id}`);
  const applicationNumber = `APP-${college.code}-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
  const application = await Application.create({
    ...data,
    college: college._id,
    program: program._id,
    applicationNumber,
    documents,
    history: [{ status: "submitted", note: "Application submitted online", by: "applicant", at: new Date() }],
  });
  await audit(null, "submit_application", "Application", application._id, { applicationNumber }, college._id);
  return json({ applicationNumber }, 201);
});
