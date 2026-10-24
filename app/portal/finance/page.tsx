"use client";

import { useMemo, useState } from "react";
import { DownloadButton } from "@/components/excel";
import { RequireRole } from "@/components/portal-shell";
import { FormModal, useOptions } from "@/components/resource";
import { Button, Card, DataTable, ErrorBox, Loading, PageHeader, SearchBox, StatusBadge, Tabs, useConfirm, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";
import { formatMoney, humanize } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
const studentLabel = (s: any) => `${s.studentId} — ${s.firstName} ${s.lastName}`;
const programLabel = (p: any) => `${p.code} — ${p.name}`;

export default function FinancePage() {
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const invoices = useApi<{ items: any[] }>("/finance/invoices");
  const payments = useApi<{ items: any[] }>(tab === "payments" ? "/finance/payments" : null);
  const students = useOptions("/students?status=active", studentLabel);
  const programs = useOptions("/programs", programLabel);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<any | null>(null);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const rows = useMemo(
    () => (invoices.data?.items ?? []).filter((i) => `${i.invoiceNumber} ${i.student?.studentId} ${i.student?.firstName} ${i.student?.lastName} ${i.description}`.toLowerCase().includes(q.toLowerCase())),
    [invoices.data, q],
  );

  return (
    <RequireRole roles={["finance_officer"]}>
      <PageHeader
        title="Invoices & payments"
        description="Bill students, record verified payments, and issue receipts. Amounts are stored exactly in the college currency."
        actions={
          <>
            <DownloadButton path="/finance/export">Finance report (.xlsx)</DownloadButton>
            <Button onClick={() => setCreating(true)}>+ New invoice</Button>
          </>
        }
      />
      <Tabs tabs={[{ key: "invoices", label: "Invoices" }, { key: "payments", label: "Payments" }]} active={tab} onChange={setTab} />
      <ErrorBox message={invoices.error ?? payments.error} />
      {tab === "invoices" ? (
        <Card padded={false} title={`${rows.length} invoices`} actions={<SearchBox value={q} onChange={setQ} />}>
          {invoices.loading && !invoices.data ? (
            <Loading />
          ) : (
            <DataTable
              rows={rows}
              columns={[
                { key: "invoiceNumber", label: "Invoice", render: (i) => <span className="font-mono">{i.invoiceNumber}</span> },
                { key: "student", label: "Student", render: (i) => `${i.student?.studentId} ${i.student?.firstName} ${i.student?.lastName}` },
                { key: "description", label: "Description" },
                { key: "amount", label: "Amount", render: (i) => formatMoney(i.amount, i.currency) },
                { key: "balance", label: "Balance", render: (i) => formatMoney(i.amount - i.paidAmount, i.currency) },
                { key: "dueDate", label: "Due", render: (i) => <span className={i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "paid" ? "font-medium text-red-600" : ""}>{fmtDate(i.dueDate)}</span> },
                { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
                {
                  key: "x",
                  label: "",
                  className: "text-right whitespace-nowrap",
                  render: (i) =>
                    (i.status === "unpaid" || i.status === "partial") && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setPaying(i)}>
                          Record payment
                        </Button>
                        {i.status === "unpaid" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={async () => {
                              const reason = await ask({ title: "Cancel invoice?", message: i.invoiceNumber, reason: true, danger: true, confirm: "Cancel invoice" });
                              if (reason === null) return;
                              try {
                                await api(`/finance/invoices/${i._id}`, { method: "PATCH", body: { action: "cancel", reason } });
                                invoices.reload();
                              } catch (e) {
                                toast((e as Error).message, "error");
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    ),
                },
              ]}
            />
          )}
        </Card>
      ) : (
        <Card padded={false}>
          {payments.loading && !payments.data ? (
            <Loading />
          ) : (
            <DataTable
              rows={payments.data?.items ?? []}
              columns={[
                { key: "receiptNumber", label: "Receipt", render: (p) => <span className="font-mono">{p.receiptNumber}</span> },
                { key: "invoice", label: "Invoice", render: (p) => p.invoice?.invoiceNumber },
                { key: "student", label: "Student", render: (p) => `${p.student?.studentId} ${p.student?.firstName} ${p.student?.lastName}` },
                { key: "amount", label: "Amount", render: (p) => formatMoney(p.amount) },
                { key: "method", label: "Method", render: (p) => humanize(p.method) },
                { key: "reference", label: "Reference" },
                { key: "paidAt", label: "Paid on", render: (p) => fmtDate(p.paidAt) },
                { key: "recordedBy", label: "Recorded by" },
              ]}
            />
          )}
        </Card>
      )}

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New invoice"
        fields={[
          { name: "description", label: "Description", required: true, placeholder: "e.g. Tuition fee — Semester I", full: true },
          { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "student", label: "Single student", type: "select", options: students, placeholder: "— or bill a group below —", full: true },
          { name: "program", label: "All active students in program", type: "select", options: programs, placeholder: "—" },
          { name: "allActive", label: "All active students in the college", type: "checkbox" },
        ]}
        initial={{}}
        submit={async (v) => {
          const res = await api("/finance/invoices", { body: v });
          toast(`${res.created} invoice(s) created`);
          invoices.reload();
        }}
      />
      <FormModal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={`Record payment — ${paying?.invoiceNumber ?? ""}`}
        fields={[
          { name: "amount", label: `Amount (outstanding ${paying ? formatMoney(paying.amount - paying.paidAmount, paying.currency) : ""})`, type: "number", step: "0.01", required: true },
          { name: "method", label: "Method", type: "select", required: true, options: ["cash", "bank_transfer", "mobile_money", "other"].map((m) => ({ value: m, label: humanize(m) })) },
          { name: "reference", label: "Bank / transaction reference", hint: "Required for non-cash payments; verified against the bank or provider statement" },
          { name: "paidAt", label: "Payment date", type: "date" },
        ]}
        initial={{ amount: paying ? (paying.amount - paying.paidAmount) / 100 : "", method: "bank_transfer", paidAt: new Date().toISOString().slice(0, 10) }}
        submit={async (v) => {
          const res = await api("/finance/payments", { body: { ...v, invoice: paying._id } });
          toast(`Payment recorded — receipt ${res.item.receiptNumber}`);
          invoices.reload();
          payments.reload();
        }}
      />
      {dialog}
    </RequireRole>
  );
}
