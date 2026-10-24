import { excelResponse, getAuth, handler, requireCollegeRole } from "@/lib/api";
import { buildWorkbook, fmtDate, stamp } from "@/lib/excel";
import { Invoice, Payment } from "@/lib/models";
import { humanize } from "@/lib/roles";

type S = { studentId: string; firstName: string; lastName: string };

export const GET = handler(async (req) => {
  const auth = await getAuth(req);
  const college = requireCollegeRole(auth, "finance_officer");
  const [invoices, payments] = await Promise.all([
    Invoice.find({ college }).populate("student", "studentId firstName lastName").sort({ createdAt: -1 }).lean(),
    Payment.find({ college }).populate("student", "studentId firstName lastName").populate("invoice", "invoiceNumber").sort({ paidAt: -1 }).lean(),
  ]);
  const money = (v: number) => +(v / 100).toFixed(2);
  const buffer = await buildWorkbook([
    {
      name: "Invoices",
      columns: [
        { header: "Invoice No.", key: "no", width: 20 },
        { header: "Student ID", key: "sid", width: 16 },
        { header: "Student Name", key: "name", width: 26 },
        { header: "Description", key: "desc", width: 30 },
        { header: "Currency", key: "cur", width: 9 },
        { header: "Amount", key: "amount", width: 12 },
        { header: "Paid", key: "paid", width: 12 },
        { header: "Balance", key: "balance", width: 12 },
        { header: "Due Date", key: "due", width: 12 },
        { header: "Status", key: "status", width: 11 },
      ],
      rows: invoices.map((i) => {
        const s = i.student as unknown as S;
        return { no: i.invoiceNumber, sid: s?.studentId, name: `${s?.firstName} ${s?.lastName}`, desc: i.description, cur: i.currency, amount: money(i.amount), paid: money(i.paidAmount), balance: money(i.amount - i.paidAmount), due: fmtDate(i.dueDate), status: humanize(i.status) };
      }),
    },
    {
      name: "Payments",
      columns: [
        { header: "Receipt No.", key: "no", width: 20 },
        { header: "Invoice No.", key: "inv", width: 20 },
        { header: "Student ID", key: "sid", width: 16 },
        { header: "Amount", key: "amount", width: 12 },
        { header: "Method", key: "method", width: 15 },
        { header: "Reference", key: "ref", width: 22 },
        { header: "Paid On", key: "date", width: 12 },
        { header: "Recorded By", key: "by", width: 20 },
      ],
      rows: payments.map((p) => ({ no: p.receiptNumber, inv: (p.invoice as unknown as { invoiceNumber: string })?.invoiceNumber, sid: (p.student as unknown as S)?.studentId, amount: money(p.amount), method: humanize(p.method), ref: p.reference, date: fmtDate(p.paidAt), by: p.recordedBy })),
    },
  ]);
  return excelResponse(buffer, `finance-report-${stamp()}.xlsx`);
});
