"use client";

import { useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { Badge, Button, Card, DataTable, Empty, ErrorBox, Loading, Notice, PageHeader, StatusBadge, useConfirm, useToast } from "@/components/ui";
import { api, useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MyRegistrationPage() {
  const catalog = useApi<{ semesters: any[] }>("/registrations/catalog");
  const mine = useApi<{ items: any[] }>("/registrations");
  const [cart, setCart] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ course: string; ok: boolean; reason?: string }[] | null>(null);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const reload = () => {
    catalog.reload();
    mine.reload();
  };

  async function submit() {
    setSubmitting(true);
    try {
      const res = await api("/registrations", { body: { sections: cart } });
      setResults(res.results);
      setCart([]);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function drop(reg: any) {
    if ((await ask({ title: `Drop ${reg.course?.code}?`, message: "You can register again while registration is open, if seats remain.", danger: true, confirm: "Drop course" })) === null) return;
    try {
      await api(`/registrations/${reg._id}`, { method: "DELETE" });
      toast("Course dropped");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const cartSections = (catalog.data?.semesters ?? []).flatMap((s) => s.sections).filter((s: any) => cart.includes(s._id));
  const cartCredits = cartSections.reduce((sum: number, s: any) => sum + s.course.credits, 0);

  return (
    <RequireRole roles={["student"]}>
      <PageHeader title="Course registration" description="Add eligible sections to your cart and submit. Registrations become official after approval." />
      <ErrorBox message={catalog.error ?? mine.error} />

      {results && (
        <div className="mb-6">
          <Card title="Registration result" actions={<Button size="sm" variant="ghost" onClick={() => setResults(null)}>Dismiss</Button>}>
            <ul className="flex flex-col gap-1 text-sm">
              {results.map((r, i) => (
                <li key={i}>
                  {r.ok ? <Badge tone="green">Submitted</Badge> : <Badge tone="red">Not registered</Badge>} <b>{r.course}</b> {r.reason && <span className="text-slate-600">— {r.reason}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <Card title="My registrations" padded={false} className="mb-6">
        {mine.loading && !mine.data ? (
          <Loading />
        ) : (
          <DataTable
            rows={(mine.data?.items ?? []).filter((r) => r.status !== "dropped")}
            empty="You have not registered for any courses yet."
            columns={[
              { key: "course", label: "Course", render: (r) => <><span className="font-mono">{r.course?.code}</span> {r.course?.title}</> },
              { key: "credits", label: "Cr.", render: (r) => r.course?.credits },
              { key: "section", label: "Sec.", render: (r) => r.section?.name },
              { key: "semester", label: "Semester", render: (r) => `${r.semester?.name} ${r.semester?.academicYear}` },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "note", label: "Note" },
              { key: "x", label: "", className: "text-right", render: (r) => r.semester?.registrationOpen && (r.status === "pending" || r.status === "approved") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => drop(r)}>Drop</Button> },
            ]}
          />
        )}
      </Card>

      {catalog.loading && !catalog.data && <Loading />}
      {catalog.data && !catalog.data.semesters.length && (
        <Card>
          <Empty title="Registration is closed">The registrar will announce when registration opens for the next semester.</Empty>
        </Card>
      )}
      {catalog.data?.semesters.map((sem) => (
        <Card
          key={sem.semester._id}
          className="mb-6"
          padded={false}
          title={`Open sections — ${sem.semester.name} ${sem.semester.academicYear}`}
          actions={<span className="text-sm text-slate-600">Registered credits: <b>{sem.currentCredits}</b> / {sem.maxCredits}</span>}
        >
          <DataTable
            rows={sem.sections}
            empty="No sections offered yet."
            columns={[
              { key: "course", label: "Course", render: (s) => <><span className="font-mono font-medium text-navy-900">{s.course.code}</span> {s.course.title}</> },
              { key: "credits", label: "Cr.", render: (s) => s.course.credits },
              { key: "name", label: "Sec." },
              { key: "instructor", label: "Instructor", render: (s) => s.instructor?.name ?? "TBA" },
              { key: "schedule", label: "Schedule", render: (s) => (s.schedule ?? []).map((x: any) => `${x.day} ${x.start}-${x.end}`).join(", ") || "TBA" },
              { key: "seats", label: "Seats", render: (s) => `${s.capacity - s.seatsTaken} left` },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (s) =>
                  s.eligible ? (
                    cart.includes(s._id) ? (
                      <Button size="sm" variant="secondary" onClick={() => setCart(cart.filter((c) => c !== s._id))}>Remove</Button>
                    ) : (
                      <Button size="sm" onClick={() => setCart([...cart, s._id])}>Add</Button>
                    )
                  ) : (
                    <span className="text-xs text-slate-500">{s.reason}</span>
                  ),
              },
            ]}
          />
        </Card>
      ))}

      {cart.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <Notice tone="blue">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Cart: <b>{cartSections.map((s: any) => s.course.code).join(", ")}</b> · {cartCredits} credits
              </span>
              <Button variant="gold" loading={submitting} onClick={submit}>
                Submit registration ({cart.length})
              </Button>
            </div>
          </Notice>
        </div>
      )}
      {dialog}
    </RequireRole>
  );
}
