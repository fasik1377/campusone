"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { Card, DataTable, ErrorBox, Loading, PageHeader, SearchBox, StatusBadge, Tabs } from "@/components/ui";
import { fmtDate, useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TABS = [
  { key: "active", label: "Needs action" },
  { key: "accepted", label: "Accepted" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

export default function ApplicationsPage() {
  const { data, error, loading } = useApi<{ items: any[] }>("/admissions/applications");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    if (tab === "active") items = items.filter((a) => ["submitted", "under_review", "info_required"].includes(a.status));
    else if (tab !== "all") items = items.filter((a) => a.status === tab);
    const needle = q.toLowerCase();
    return items.filter((a) => `${a.applicationNumber} ${a.firstName} ${a.lastName} ${a.email} ${a.program?.name}`.toLowerCase().includes(needle));
  }, [data, tab, q]);

  return (
    <RequireRole roles={["registrar", "admissions_officer", "college_admin"]}>
      <PageHeader title="Admissions" description="Review online applications, verify documents, and admit applicants. Accepting an applicant creates their student record and login automatically." />
      <ErrorBox message={error} />
      <Tabs tabs={[...TABS]} active={tab} onChange={setTab} />
      <Card padded={false} title={`${rows.length} applications`} actions={<SearchBox value={q} onChange={setQ} />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            empty="No applications in this list."
            columns={[
              { key: "applicationNumber", label: "Application", render: (a) => <Link className="font-mono font-medium text-navy-900 hover:underline" href={`/portal/applications/${a._id}`}>{a.applicationNumber}</Link> },
              { key: "name", label: "Applicant", render: (a) => `${a.firstName} ${a.lastName}` },
              { key: "program", label: "Program", render: (a) => a.program?.name },
              { key: "documents", label: "Docs", render: (a) => a.documents?.length ?? 0 },
              { key: "createdAt", label: "Submitted", render: (a) => fmtDate(a.createdAt) },
              { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
              { key: "x", label: "", className: "text-right", render: (a) => <Link href={`/portal/applications/${a._id}`} className="text-sm text-navy-500 hover:underline">Review →</Link> },
            ]}
          />
        )}
      </Card>
    </RequireRole>
  );
}
