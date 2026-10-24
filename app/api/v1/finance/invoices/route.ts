import { z } from "zod";
import { audit, badRequest, getAuth, getOwnStudent, handler, json, parseBody, requireCollegeRole, requireModule, zs } from "@/lib/api";
import { College, Invoice, nextSequence, Student } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  requireModule(auth, "finance");
  const params = req.nextUrl.searchParams;
  const query: Record<string, unknown> = {};
  if (auth.has("finance_officer", "college_admin", "registrar")) {
    query.college = requireCollegeRole(auth);
    const student = params.get("student");
    if (student) query.student = student;
  } else {
    query.student = (await getOwnStudent(auth))._id;
  }
  const status = params.get("status");
  if (status) query.status = status;
  const items = await Invoice.find(query)
    .populate("student", "studentId firstName lastName")
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  return json({ items });
});

const schema = z
  .object({
    student: zs.optId,
    program: zs.optId,
    allActive: zs.bool.default(false),
    description: zs.req(200),
    amount: z.coerce.number().positive("Amount must be greater than zero").max(10_000_000),
    dueDate: zs.date,
  })
  .refine((d) => d.student || d.program || d.allActive, "Choose a student, a program, or all active students");

/** Creates one invoice, or the same fee for every active student in a program / the college. */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer");
  requireModule(auth, "finance");
  const data = await parseBody(req, schema);
  const target: Record<string, unknown> = { college };
  if (data.student) target._id = data.student;
  else {
    target.status = "active";
    if (data.program) target.program = data.program;
  }
  const students = await Student.find(target).select("_id").lean();
  if (!students.length) throw badRequest("No matching students were found.");
  const { code, currency } = (await College.findById(college).select("code currency").lean())!;
  const amount = Math.round(data.amount * 100); // stored in minor units
  const docs = [];
  for (const s of students) {
    const seq = await nextSequence(`invoice:${college}`);
    docs.push({
      college,
      student: s._id,
      invoiceNumber: `INV-${code}-${String(seq).padStart(6, "0")}`,
      description: data.description,
      amount,
      currency,
      dueDate: data.dueDate,
      createdBy: auth.user.name,
    });
  }
  await Invoice.insertMany(docs);
  await audit(auth, "create_invoices", "Invoice", null, { count: docs.length, description: data.description, amount });
  return json({ created: docs.length }, 201);
});
