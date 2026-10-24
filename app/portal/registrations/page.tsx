"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { useOptions } from "@/components/resource";
import { Button, Card, DataTable, ErrorBox, Loading, PageHeader, SearchBox, Select, StatusBadge, Tabs, useConfirm, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const semesterLabel = (s: any) => `${s.name} ${s.academicYear}${s.isCurrent ? " (current)" : ""}`;

export default function RegistrationsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "dropped">("pending");
  const [semester, setSemester] = useState("");
  const semesters = useOptions("/semesters", semesterLabel);
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/registrations?status=${tab}${semester ? `&semester=${semester}` : ""}`);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const rows = useMemo(
    () => (data?.items ?? []).filter((r) => `${r.student?.studentId} ${r.student?.firstName} ${r.student?.lastName} ${r.course?.code}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  async function decide(ids: string[], action: "approve" | "reject") {
    let note: string | undefined;
    if (action === "reject") {
      const r = await ask({ title: `Reject ${ids.length} registration(s)?`, message: "The student will see your reason.", reason: true, danger: true, confirm: "Reject" });
      if (r === null) return;
      note = r;
    }
    setBusy(true);
    let ok = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await api(`/registrations/${id}`, { body: { action, note } });
        ok++;
      } catch (e) {
        failures.push((e as Error).message);
      }
    }
    setBusy(false);
    setSelected([]);
    if (ok) toast(`${ok} registration(s) ${action === "approve" ? "approved" : "rejected"}`);
    if (failures.length) toast(failures[0], "error");
    reload();
  }

  return (
    <RequireRole roles={["registrar", "department_head", "college_admin"]}>
      <PageHeader title="Course registrations" description="Students' registration requests. Prerequisites, capacity, credit load and timetable conflicts were checked when they registered." />
      <div className="mb-4 max-w-xs">
        <Select label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} options={semesters} placeholder="All semesters" />
      </div>
      <Tabs
        tabs={[
          { key: "pending", label: "Awaiting approval" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
          { key: "dropped", label: "Dropped" },
        ]}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setSelected([]);
        }}
      />
      <ErrorBox message={error} />
      <Card
        padded={false}
        title={`${rows.length} registrations`}
        actions={
          <>
            <SearchBox value={q} onChange={setQ} />
            {tab === "pending" && (
              <>
                <Button variant="secondary" disabled={!rows.length} onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r._id))}>
                  {selected.length === rows.length && rows.length ? "Clear" : "Select all"}
                </Button>
                <Button disabled={!selected.length} loading={busy} onClick={() => decide(selected, "approve")}>
                  Approve ({selected.length})
                </Button>
                <Button variant="danger" disabled={!selected.length} onClick={() => decide(selected, "reject")}>
                  Reject
                </Button>
              </>
            )}
          </>
        }
      >
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              ...(tab === "pending"
                ? [
                    {
                      key: "sel",
                      label: "",
                      render: (r: any) => (
                        <input type="checkbox" aria-label="Select" className="h-4 w-4 accent-navy-900" checked={selected.includes(r._id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r._id] : selected.filter((x) => x !== r._id))} />
                      ),
                    },
                  ]
                : []),
              { key: "student", label: "Student", render: (r) => <Link href={`/portal/students/${r.student?._id}`} className="hover:underline"><span className="font-mono">{r.student?.studentId}</span> {r.student?.firstName} {r.student?.lastName}</Link> },
              { key: "course", label: "Course", render: (r) => `${r.course?.code} — ${r.course?.title}` },
              { key: "credits", label: "Cr.", render: (r) => r.course?.credits },
              { key: "section", label: "Sec.", render: (r) => r.section?.name },
              { key: "semester", label: "Semester", render: (r) => `${r.semester?.name} ${r.semester?.academicYear}` },
              { key: "createdAt", label: "Requested", render: (r) => fmtDate(r.createdAt) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ...(tab === "pending"
                ? [
                    {
                      key: "x",
                      label: "",
                      className: "text-right whitespace-nowrap",
                      render: (r: any) => (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => decide([r._id], "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => decide([r._id], "reject")}>
                            Reject
                          </Button>
                        </>
                      ),
                    },
                  ]
                : [{ key: "note", label: "Note", render: (r: any) => r.note ?? "" }]),
            ]}
          />
        )}
      </Card>
      {dialog}
    </RequireRole>
  );
}
