"use client";

import { useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { FormModal } from "@/components/resource";
import { Button, Card, DataTable, ErrorBox, Loading, PageHeader, StatusBadge, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";
import { humanize } from "@/lib/roles";

const TYPES = ["transcript", "enrollment_verification", "clearance", "graduation", "other"];

export default function MyRequestsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error, loading, reload } = useApi<{ items: any[] }>("/requests");
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  return (
    <RequireRole roles={["student"]}>
      <PageHeader title="Service requests" description="Request official transcripts, enrollment verification letters, clearance or graduation review." actions={<Button onClick={() => setCreating(true)}>+ New request</Button>} />
      <ErrorBox message={error} />
      <Card padded={false}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={data?.items ?? []}
            empty="You have no requests."
            columns={[
              { key: "type", label: "Request", render: (r) => humanize(r.type) },
              { key: "details", label: "Details" },
              { key: "createdAt", label: "Submitted", render: (r) => fmtDate(r.createdAt) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "response", label: "Response from registrar" },
            ]}
          />
        )}
      </Card>
      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New service request"
        fields={[
          { name: "type", label: "Request type", type: "select", required: true, options: TYPES.map((t) => ({ value: t, label: humanize(t) })), full: true },
          { name: "details", label: "Details (purpose, number of copies, recipient…)", type: "textarea" },
        ]}
        initial={{ type: "transcript" }}
        submit={async (v) => {
          await api("/requests", { body: v });
          toast("Request submitted");
          reload();
        }}
      />
    </RequireRole>
  );
}
