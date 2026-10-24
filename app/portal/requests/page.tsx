"use client";

import { useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { FormModal } from "@/components/resource";
import { Button, Card, DataTable, ErrorBox, Loading, PageHeader, StatusBadge, Tabs, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";
import { humanize } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function RequestsPage() {
  const [tab, setTab] = useState<"submitted" | "in_progress" | "completed" | "rejected">("submitted");
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/requests?status=${tab}`);
  const [handling, setHandling] = useState<any | null>(null);
  const toast = useToast();

  return (
    <RequireRole roles={["registrar"]}>
      <PageHeader title="Student service requests" description="Transcript, enrollment verification, clearance and graduation requests." />
      <Tabs
        tabs={[
          { key: "submitted", label: "New" },
          { key: "in_progress", label: "In progress" },
          { key: "completed", label: "Completed" },
          { key: "rejected", label: "Rejected" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <ErrorBox message={error} />
      <Card padded={false}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={data?.items ?? []}
            columns={[
              { key: "student", label: "Student", render: (r) => <><span className="font-mono">{r.student?.studentId}</span> {r.student?.firstName} {r.student?.lastName}</> },
              { key: "type", label: "Request", render: (r) => humanize(r.type) },
              { key: "details", label: "Details" },
              { key: "createdAt", label: "Submitted", render: (r) => fmtDate(r.createdAt) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "response", label: "Response" },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (r) =>
                  (r.status === "submitted" || r.status === "in_progress") && (
                    <Button size="sm" variant="ghost" onClick={() => setHandling(r)}>
                      Process
                    </Button>
                  ),
              },
            ]}
          />
        )}
      </Card>
      <FormModal
        open={!!handling}
        onClose={() => setHandling(null)}
        title={`${humanize(handling?.type ?? "")} request`}
        fields={[
          { name: "status", label: "New status", type: "select", required: true, options: ["in_progress", "completed", "rejected"].map((s) => ({ value: s, label: humanize(s) })) },
          { name: "response", label: "Response to the student", type: "textarea" },
        ]}
        initial={{ status: "completed", response: handling?.response ?? "" }}
        submit={async (v) => {
          await api(`/requests/${handling._id}`, { method: "PATCH", body: v });
          toast("Request updated");
          reload();
        }}
      />
    </RequireRole>
  );
}
