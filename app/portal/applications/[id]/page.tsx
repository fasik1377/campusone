"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { Button, Card, DescriptionList, ErrorBox, Input, Loading, Modal, Notice, PageHeader, StatusBadge, Textarea, useToast } from "@/components/ui";
import { api, fmtDate, fmtDateTime, useApi } from "@/lib/client";
import { humanize } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ACTIONS: { action: string; label: string; variant: "primary" | "secondary" | "gold" | "danger"; registrarOnly?: boolean; note?: boolean }[] = [
  { action: "under_review", label: "Mark under review", variant: "secondary" },
  { action: "info_required", label: "Request more information", variant: "secondary", note: true },
  { action: "waitlisted", label: "Waitlist", variant: "secondary" },
  { action: "rejected", label: "Reject", variant: "danger", registrarOnly: true, note: true },
  { action: "accepted", label: "Accept & create student", variant: "gold", registrarOnly: true },
];

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { data, error, loading, reload } = useApi<{ item: any }>(`/admissions/applications/${id}`);
  const [pending, setPending] = useState<(typeof ACTIONS)[number] | null>(null);
  const [note, setNote] = useState("");
  const [cohort, setCohort] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ studentId: string; username: string; password: string } | null>(null);
  const toast = useToast();

  async function decide() {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await api(`/admissions/applications/${id}`, { body: { action: pending.action, note, cohort } });
      if (res.credentials) setCredentials(res.credentials);
      toast(`Application ${humanize(pending.action).toLowerCase()}`);
      setPending(null);
      setNote("");
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const a = data?.item;
  const closed = a && (a.status === "accepted" || a.status === "rejected");
  const canAct = me.has("registrar", "admissions_officer");

  return (
    <RequireRole roles={["registrar", "admissions_officer", "college_admin"]}>
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {a && (
        <>
          <PageHeader
            back={{ href: "/portal/applications", label: "Applications" }}
            title={`${a.firstName} ${a.lastName}`}
            description={
              <span className="flex items-center gap-2">
                <span className="font-mono">{a.applicationNumber}</span> <StatusBadge status={a.status} />
              </span>
            }
            actions={
              canAct &&
              !closed &&
              ACTIONS.filter((x) => (!x.registrarOnly || me.has("registrar")) && x.action !== a.status).map((x) => (
                <Button key={x.action} variant={x.variant} onClick={() => setPending(x)}>
                  {x.label}
                </Button>
              ))
            }
          />
          {a.student && (
            <div className="mb-4">
              <Notice tone="green">
                Admitted as student <b>{a.student.studentId}</b>.{" "}
                {me.has("registrar") && (
                  <Link className="underline" href={`/portal/students/${a.student._id}`}>
                    Open student record
                  </Link>
                )}
              </Notice>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Applicant" className="xl:col-span-2">
              <DescriptionList
                items={[
                  ["Program", `${a.program?.name} (${a.program?.code})`],
                  ["Email", a.email],
                  ["Phone", a.phone],
                  ["Gender", a.gender],
                  ["Date of birth", fmtDate(a.dateOfBirth)],
                  ["Address", a.address],
                  ["Previous school", a.previousSchool],
                  ["Previous result / GPA", a.previousResult],
                  ["Submitted", fmtDateTime(a.createdAt)],
                ]}
              />
              {a.statement && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Personal statement</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-navy-900">{a.statement}</p>
                </div>
              )}
              {a.program?.admissionRequirements && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-navy-900">Program requirements</p>
                  <p className="whitespace-pre-line text-slate-600">{a.program.admissionRequirements}</p>
                </div>
              )}
            </Card>
            <div className="flex flex-col gap-6">
              <Card title="Documents">
                <ul className="flex flex-col gap-2">
                  {a.documents.map((d: any) => (
                    <li key={d.fileId}>
                      <a className="text-sm font-medium text-navy-500 hover:underline" href={`/api/v1/files/${d.fileId}`}>
                        📎 {d.name}
                      </a>
                      <span className="ml-1 text-xs text-slate-400">({Math.round(d.size / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="History">
                <ol className="flex flex-col gap-3 border-l-2 border-gold-500 pl-4">
                  {[...a.history].reverse().map((h: any, i: number) => (
                    <li key={i} className="text-sm">
                      <StatusBadge status={h.status} /> <span className="text-xs text-slate-400">{fmtDateTime(h.at)} · {h.by}</span>
                      {h.note && <p className="mt-1 text-slate-600">{h.note}</p>}
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.label ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={pending?.variant === "danger" ? "danger" : "primary"} loading={busy} disabled={pending?.note && !note.trim()} onClick={decide}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ErrorBox message={actionError} />
          {pending?.action === "accepted" && (
            <>
              <Notice>This creates an official student record with a student ID and a login account. The temporary password is shown once.</Notice>
              <Input label="Cohort / intake year" value={cohort} onChange={(e) => setCohort(e.target.value)} />
            </>
          )}
          <Textarea label={pending?.note ? "Message to the applicant" : "Note (optional)"} required={pending?.note} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>

      <Modal open={!!credentials} onClose={() => setCredentials(null)} title="Student account created" footer={<Button onClick={() => setCredentials(null)}>Done</Button>}>
        <p className="text-sm text-slate-600">Give these credentials to the new student. They will be asked to change the password at first sign-in.</p>
        <p className="mt-3 rounded-lg bg-navy-50 p-3 font-mono text-sm">
          Student ID: {credentials?.studentId}
          <br />
          Username: {credentials?.username}
          <br />
          Password: {credentials?.password}
        </p>
      </Modal>
    </RequireRole>
  );
}
