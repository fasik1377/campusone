"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { FormModal, useOptions } from "@/components/resource";
import { Button, Card, DataTable, DescriptionList, ErrorBox, Loading, Modal, PageHeader, StatCard, StatusBadge, Tabs, useToast } from "@/components/ui";
import { TranscriptView } from "@/components/transcript";
import { api, fmtDate, isoDate, useApi } from "@/lib/client";
import { formatMoney, humanize, STUDENT_STATUSES } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programLabel = (p: any) => `${p.code} — ${p.name}`;

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { data, error, loading, reload } = useApi<any>(`/students/${id}`);
  const programs = useOptions(me.has("registrar") ? "/programs" : null, programLabel);
  const [tab, setTab] = useState<"profile" | "transcript" | "registrations" | "finance" | "history">("profile");
  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const toast = useToast();

  const s = data?.item;
  const isRegistrar = me.has("registrar");

  return (
    <RequireRole roles={["registrar", "college_admin", "dean", "department_head"]}>
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {s && (
        <>
          <PageHeader
            back={{ href: "/portal/students", label: "Students" }}
            title={`${s.firstName} ${s.lastName}`}
            description={
              <span className="flex items-center gap-2">
                <span className="font-mono">{s.studentId}</span> · {s.program?.name} <StatusBadge status={s.status} />
              </span>
            }
            actions={
              isRegistrar && (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                  <Button variant="secondary" onClick={() => setStatusOpen(true)}>
                    Change status / transfer
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const res = await api(`/students/${id}`, { method: "PATCH", body: { resetPassword: true } });
                        setPassword(res.temporaryPassword);
                      } catch (e) {
                        toast((e as Error).message, "error");
                      }
                    }}
                  >
                    Reset password
                  </Button>
                  <Button variant="ghost" onClick={() => window.print()}>
                    Print transcript
                  </Button>
                </>
              )
            }
          />
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Cumulative GPA" value={data.transcript.cgpa.toFixed(2)} tone={data.transcript.cgpa && data.transcript.cgpa < 2 ? "danger" : "success"} />
            <StatCard label="Credits earned" value={`${data.transcript.creditsEarned} / ${s.program?.totalCredits ?? "—"}`} />
            <StatCard label="Standing" value={data.transcript.standing} />
            <StatCard label="Balance" value={formatMoney(data.invoices.filter((i: any) => i.status !== "cancelled").reduce((sum: number, i: any) => sum + i.amount - i.paidAmount, 0))} />
          </div>
          <Tabs
            tabs={[
              { key: "profile", label: "Profile" },
              { key: "transcript", label: "Transcript" },
              { key: "registrations", label: "Registrations" },
              { key: "finance", label: "Finance" },
              { key: "history", label: "Status history" },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "profile" && (
            <Card>
              <DescriptionList
                items={[
                  ["Email", s.email],
                  ["Phone", s.phone],
                  ["Gender", s.gender],
                  ["Date of birth", fmtDate(s.dateOfBirth)],
                  ["Address", s.address],
                  ["Emergency contact", [s.emergencyContactName, s.emergencyContactPhone].filter(Boolean).join(" · ")],
                  ["Department", s.department?.name],
                  ["Program", `${s.program?.name} (${s.program?.code})`],
                  ["Cohort", s.cohort],
                  ["Study mode", s.studyMode],
                  ["Admitted", fmtDate(s.admissionDate)],
                  ["Username", s.user?.username],
                ]}
              />
            </Card>
          )}
          {tab === "transcript" && <TranscriptView transcript={data.transcript} student={s} />}
          {tab === "registrations" && (
            <Card padded={false}>
              <DataTable
                rows={data.registrations}
                columns={[
                  { key: "semester", label: "Semester", render: (r) => `${r.semester?.name} ${r.semester?.academicYear}` },
                  { key: "course", label: "Course", render: (r) => `${r.course?.code} — ${r.course?.title}` },
                  { key: "credits", label: "Credits", render: (r) => r.course?.credits },
                  { key: "section", label: "Section", render: (r) => r.section?.name },
                  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
                  { key: "decidedBy", label: "Decided by" },
                ]}
              />
            </Card>
          )}
          {tab === "finance" && (
            <Card padded={false}>
              <DataTable
                rows={data.invoices}
                columns={[
                  { key: "invoiceNumber", label: "Invoice" },
                  { key: "description", label: "Description" },
                  { key: "amount", label: "Amount", render: (i) => formatMoney(i.amount, i.currency) },
                  { key: "paidAmount", label: "Paid", render: (i) => formatMoney(i.paidAmount, i.currency) },
                  { key: "dueDate", label: "Due", render: (i) => fmtDate(i.dueDate) },
                  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
                ]}
              />
            </Card>
          )}
          {tab === "history" && (
            <Card>
              <ol className="flex flex-col gap-3 border-l-2 border-gold-500 pl-4">
                {[...(s.statusHistory ?? [])].reverse().map((h: any, i: number) => (
                  <li key={i} className="text-sm">
                    <b className="text-navy-900">{humanize(h.status)}</b> <span className="text-xs text-slate-400">{fmtDate(h.at)} · {h.by}</span>
                    {h.reason && <p className="text-slate-600">{h.reason}</p>}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <FormModal
            open={editing}
            onClose={() => setEditing(false)}
            title="Edit student profile"
            fields={[
              { name: "firstName", label: "First name", required: true },
              { name: "lastName", label: "Last name", required: true },
              { name: "email", label: "Email", type: "email" },
              { name: "phone", label: "Phone" },
              { name: "gender", label: "Gender", type: "select", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }] },
              { name: "dateOfBirth", label: "Date of birth", type: "date" },
              { name: "cohort", label: "Cohort" },
              { name: "studyMode", label: "Study mode" },
              { name: "emergencyContactName", label: "Emergency contact name" },
              { name: "emergencyContactPhone", label: "Emergency contact phone" },
              { name: "address", label: "Address", full: true },
            ]}
            initial={{ ...s, dateOfBirth: isoDate(s.dateOfBirth) }}
            submit={async (v) => {
              const { firstName, lastName, email, phone, gender, dateOfBirth, cohort, studyMode, emergencyContactName, emergencyContactPhone, address } = v;
              await api(`/students/${id}`, { method: "PATCH", body: { firstName, lastName, email, phone, gender, dateOfBirth, cohort, studyMode, emergencyContactName, emergencyContactPhone, address } });
              toast("Profile updated");
              reload();
            }}
          />
          <FormModal
            open={statusOpen}
            onClose={() => setStatusOpen(false)}
            title="Change status or transfer program"
            fields={[
              { name: "status", label: "Status", type: "select", options: STUDENT_STATUSES.map((x) => ({ value: x, label: humanize(x) })) },
              { name: "program", label: "Program", type: "select", options: programs },
              { name: "reason", label: "Reason (required, recorded in history)", type: "textarea", required: true },
            ]}
            initial={{ status: s.status, program: s.program?._id }}
            submit={async (v) => {
              await api(`/students/${id}`, { method: "PATCH", body: { status: v.status, program: v.program, reason: v.reason } });
              toast("Student record updated");
              reload();
            }}
          />
          <Modal open={!!password} onClose={() => setPassword(null)} title="New temporary password" footer={<Button onClick={() => setPassword(null)}>Done</Button>}>
            <p className="rounded-lg bg-navy-50 p-3 font-mono text-sm">
              Username: {s.user?.username}
              <br />
              Password: {password}
            </p>
          </Modal>
        </>
      )}
    </RequireRole>
  );
}
