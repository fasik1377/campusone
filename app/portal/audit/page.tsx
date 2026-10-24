"use client";

import { useMemo, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { Card, DataTable, ErrorBox, Loading, PageHeader, SearchBox } from "@/components/ui";
import { fmtDateTime, useApi } from "@/lib/client";
import { humanize } from "@/lib/roles";

type Log = { _id: string; action: string; entity?: string; entityId?: string; actorName?: string; createdAt: string; college?: { code: string }; details?: Record<string, unknown> };

export default function AuditPage() {
  const { data, error, loading } = useApi<{ items: Log[] }>("/audit-logs");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.items ?? []).filter((l) => `${l.action} ${l.entity} ${l.actorName} ${l.college?.code}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );
  return (
    <RequireRole superAdmin roles={["college_admin"]}>
      <PageHeader title="Audit log" description="Sensitive actions with who did them, when, and in which college. Entries cannot be edited." />
      <ErrorBox message={error} />
      <Card padded={false} title={`${rows.length} entries`} actions={<SearchBox value={q} onChange={setQ} />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "createdAt", label: "When", className: "whitespace-nowrap", render: (l) => fmtDateTime(l.createdAt) },
              { key: "actorName", label: "Actor" },
              { key: "action", label: "Action", render: (l) => humanize(l.action) },
              { key: "entity", label: "Record" },
              { key: "college", label: "College", render: (l) => l.college?.code ?? "—" },
              {
                key: "details",
                label: "Details",
                render: (l) => (
                  <span className="block max-w-md truncate font-mono text-xs text-slate-500" title={JSON.stringify(l.details)}>
                    {l.details ? JSON.stringify(l.details) : ""}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>
    </RequireRole>
  );
}
