"use client";

import { useMemo, useState } from "react";
import { categoryLabel, ComplaintRow, ComplaintThread, type ComplaintSummary } from "@/components/complaints";
import { RequireRole } from "@/components/portal-shell";
import { Card, Empty, ErrorBox, Loading, PageHeader, SearchBox, Select, Tabs } from "@/components/ui";
import { useApi } from "@/lib/client";
import { COMPLAINT_CATEGORIES } from "@/lib/roles";

const TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Closed" },
] as const;

export default function ComplaintsInboxPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useApi<{ items: ComplaintSummary[] }>(`/complaints?status=${tab}${category ? `&category=${category}` : ""}`);
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(
    () => (data?.items ?? []).filter((c) => `${c.ticketNumber} ${c.subject} ${c.student?.studentId} ${c.student?.firstName} ${c.student?.lastName} ${c.course?.code}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );
  const current = items.find((c) => c._id === selected)?._id ?? items[0]?._id ?? null;
  const unread = items.filter((c) => c.staffUnread).length;

  return (
    <RequireRole roles={["registrar", "college_admin", "dean", "department_head", "instructor"]}>
      <PageHeader
        title="Complaints & grade appeals"
        description="Students' complaints. Reply in the thread; the registrar resolves or closes each one. For grade appeals, correct the grade from the mark sheet so the change is recorded."
      />
      <Tabs
        tabs={TABS.map((t) => ({ ...t, label: t.key === "open" && unread ? `${t.label} (${unread} new)` : t.label }))}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setSelected(null);
        }}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-60">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))} placeholder="All categories" />
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search ticket, student, course…" />
      </div>
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && !items.length && (
        <Card>
          <Empty title={tab === "open" ? "No open complaints" : "Nothing here"}>{tab === "open" ? "New complaints from students appear here." : ""}</Empty>
        </Card>
      )}
      {!!items.length && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className="flex max-h-[75vh] flex-col gap-2 overflow-y-auto pr-1">
            {items.map((c) => (
              <ComplaintRow key={c._id} c={c} showStudent active={c._id === current} unread={!!c.staffUnread} onClick={() => setSelected(c._id)} />
            ))}
          </div>
          {current && (
            <Card className="min-h-[560px]">
              <ComplaintThread key={current} id={current} onChanged={reload} />
            </Card>
          )}
        </div>
      )}
    </RequireRole>
  );
}
