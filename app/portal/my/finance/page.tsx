"use client";

import { RequireRole } from "@/components/portal-shell";
import { Card, DataTable, ErrorBox, Loading, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { fmtDate, useApi } from "@/lib/client";
import { formatMoney } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MyFinancePage() {
  const { data, error, loading } = useApi<any>("/me/student");
  const invoices = data?.invoices ?? [];
  const overdue = invoices.filter((i: any) => i.status !== "paid" && i.dueDate && new Date(i.dueDate) < new Date());
  return (
    <RequireRole roles={["student"]}>
      <PageHeader title="Fees & payments" description="Your invoices and balances. Pay at the finance office or by bank transfer quoting your invoice number." />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Balance due" value={formatMoney(data.balance)} tone={data.balance ? "warning" : "success"} />
            <StatCard label="Total billed" value={formatMoney(invoices.reduce((s: number, i: any) => s + i.amount, 0))} />
            <StatCard label="Overdue invoices" value={overdue.length} tone={overdue.length ? "danger" : "success"} />
          </div>
          {!!overdue.length && (
            <div className="mb-4">
              <Notice tone="amber">You have overdue fees. Course registration may be blocked until they are cleared.</Notice>
            </div>
          )}
          <Card padded={false}>
            <DataTable
              rows={invoices}
              empty="No invoices."
              columns={[
                { key: "invoiceNumber", label: "Invoice", render: (i) => <span className="font-mono">{i.invoiceNumber}</span> },
                { key: "description", label: "Description" },
                { key: "amount", label: "Amount", render: (i) => formatMoney(i.amount, i.currency) },
                { key: "paidAmount", label: "Paid", render: (i) => formatMoney(i.paidAmount, i.currency) },
                { key: "balance", label: "Balance", render: (i) => <b>{formatMoney(i.amount - i.paidAmount, i.currency)}</b> },
                { key: "dueDate", label: "Due", render: (i) => fmtDate(i.dueDate) },
                { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
              ]}
            />
          </Card>
        </>
      )}
    </RequireRole>
  );
}
