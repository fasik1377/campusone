import { z } from "zod";
import { audit, badRequest, getAuth, handler, json, notFound, parseBody, requireCollegeRole, toId, zs } from "@/lib/api";
import { Invoice, Payment } from "@/lib/models";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer", "student");
  const query: Record<string, unknown> = { _id: toId((await params).id, "Invoice"), college };
  const invoice = await Invoice.findOne(query).populate("student", "studentId firstName lastName user").lean();
  if (!invoice) throw notFound("Invoice");
  // Students may only open their own invoices.
  if (!auth.has("finance_officer") && String((invoice.student as unknown as { user: unknown }).user) !== String(auth.userId)) throw notFound("Invoice");
  const payments = await Payment.find({ invoice: invoice._id }).sort({ paidAt: -1 }).lean();
  return json({ item: invoice, payments });
});

const schema = z.object({ action: z.literal("cancel"), reason: zs.req(300) });

export const PATCH = handler<P>(async (req, { params }) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer");
  const invoice = await Invoice.findOne({ _id: toId((await params).id, "Invoice"), college });
  if (!invoice) throw notFound("Invoice");
  const { reason } = await parseBody(req, schema);
  if (invoice.paidAmount > 0) throw badRequest("An invoice with payments cannot be cancelled; record a refund adjustment instead.");
  invoice.status = "cancelled";
  await invoice.save();
  await audit(auth, "cancel_invoice", "Invoice", invoice._id, { reason });
  return json({ item: invoice });
});
