"use client";

import { useState } from "react";
import { ComplaintRow, ComplaintThread, NewComplaintModal, type ComplaintSummary } from "@/components/complaints";
import { RequireRole } from "@/components/portal-shell";
import { Button, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/client";

export default function MyComplaintsPage() {
  const { data, error, loading, reload } = useApi<{ items: ComplaintSummary[] }>("/complaints");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const items = data?.items ?? [];
  const current = selected ?? items[0]?._id ?? null;

  return (
    <RequireRole roles={["student"]}>
      <PageHeader
        title="Complaints & appeals"
        description="Raise a problem with a grade, course, registration, attendance or fees. The registrar replies here, and you can follow every step."
        actions={<Button onClick={() => setCreating(true)}>+ New complaint</Button>}
      />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && !items.length && (
        <Card>
          <Empty title="No complaints yet">To appeal a grade, open Grades & transcript and choose “Report a problem” next to the course.</Empty>
        </Card>
      )}
      {!!items.length && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-2">
            {items.map((c) => (
              <ComplaintRow key={c._id} c={c} active={c._id === current} unread={!!c.studentUnread} onClick={() => setSelected(c._id)} />
            ))}
          </div>
          {current && (
            <Card className="min-h-[520px]">
              <ComplaintThread key={current} id={current} onChanged={reload} />
            </Card>
          )}
        </div>
      )}
      <NewComplaintModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setSelected(id);
          reload();
        }}
      />
    </RequireRole>
  );
}
