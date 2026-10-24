import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, requireModule, zs } from "@/lib/api";
import { College, Invoice, nextSequence, Payment } from "@/lib/models";

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer");
  requireModule(auth, "finance");
  const items = await Payment.find({ college })
    .populate("student", "studentId firstName lastName")
    .populate("invoice", "invoiceNumber description")
    .sort({ paidAt: -1 })
    .limit(1000)
    .lean();
  return json({ items });
});

const schema = z.object({
  invoice: zs.id,
  amount: z.coerce.number().positive().max(10_000_000),
  method: z.enum(["cash", "bank_transfer", "mobile_money", "other"]),
  reference: zs.str(120),
  paidAt: zs.date,
});

/** A finance officer records a payment they have verified (bank slip, receipt, provider statement). */
export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer");
  requireModule(auth, "finance");
  const data = await parseBody(req, schema);
  const invoice = await Invoice.findOne({ _id: data.invoice, college });
  if (!invoice) throw notFound("Invoice");
  if (invoice.status === "cancelled" || invoice.status === "paid") throw badRequest(`This invoice is ${invoice.status}.`);
  const amount = Math.round(data.amount * 100);
  const outstanding = invoice.amount - invoice.paidAmount;
  if (amount > outstanding) throw badRequest(`Amount exceeds the outstanding balance (${(outstanding / 100).toFixed(2)}).`);
  if (data.method !== "cash" && !data.reference) throw badRequest("A transaction reference is required for non-cash payments.");
  if (data.reference && (await Payment.exists({ college, reference: data.reference, method: data.method }))) {
    throw badRequest("A payment with this transaction reference was already recorded.");
  }

  const { code } = (await College.findById(college).select("code").lean())!;
  const seq = await nextSequence(`receipt:${college}`);
  const payment = await Payment.create({
    college,
    invoice: invoice._id,
    student: invoice.student,
    amount,
    method: data.method,
    reference: data.reference,
    receiptNumber: `RCT-${code}-${String(seq).padStart(6, "0")}`,
    recordedBy: auth.user.name,
    paidAt: data.paidAt ?? new Date(),
  });
  invoice.paidAmount += amount;
  invoice.status = invoice.paidAmount >= invoice.amount ? "paid" : "partial";
  await invoice.save();
  await audit(auth, "record_payment", "Payment", payment._id, { invoice: invoice.invoiceNumber, amount, method: data.method, reference: data.reference });
  return json({ item: payment }, 201);
});
