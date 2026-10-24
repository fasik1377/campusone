"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DownloadButton, ExcelUpload } from "@/components/excel";
import { RequireRole, useMe } from "@/components/portal-shell";
import { FormModal, useOptions } from "@/components/resource";
import { Badge, Button, Card, DataTable, ErrorBox, Loading, Modal, PageHeader, SearchBox, Select, StatusBadge, useToast } from "@/components/ui";
import { api, saveBlob, toCsv, useApi } from "@/lib/client";
import { STUDENT_STATUSES, humanize } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type ImportResult = { created: number; failed: number; results: { row: number; ok: boolean; message?: string; name?: string; studentId?: string; username?: string; password?: string }[] };
const programLabel = (p: any) => `${p.code} — ${p.name}`;

export default function StudentsPage() {
  const me = useMe();
  const isRegistrar = me.has("registrar");
  const [status, setStatus] = useState("active");
  const [program, setProgram] = useState("");
  const params = new URLSearchParams({ ...(status && { status }), ...(program && { program }) }).toString();
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/students?${params}`);
  const programs = useOptions("/programs", programLabel);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [created, setCreated] = useState<{ studentId: string; username: string; password: string } | null>(null);
  const toast = useToast();

  const rows = useMemo(
    () => (data?.items ?? []).filter((s) => `${s.studentId} ${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  function downloadCredentials() {
    const ok = result?.results.filter((r) => r.ok) ?? [];
    const csv = toCsv(ok.map((r) => ({ "Student ID": r.studentId, Name: r.name, Username: r.username, "Temporary Password": r.password })));
    saveBlob(new Blob([csv], { type: "text/csv" }), "imported-student-credentials.csv");
  }

  return (
    <RequireRole roles={["registrar", "college_admin", "dean", "department_head"]}>
      <PageHeader
        title="Students"
        description="Official student records. Registrars can add students one by one or import them in bulk from Excel."
        actions={
          <>
            {me.has("registrar", "college_admin") && <DownloadButton path={`/students/export?${params}`}>Export to Excel</DownloadButton>}
            {isRegistrar && (
              <>
                <Button variant="secondary" onClick={() => setImporting(true)}>
                  ⬆ Import from Excel
                </Button>
                <Button onClick={() => setCreating(true)}>+ New student</Button>
              </>
            )}
          </>
        }
      />
      <div className="mb-4 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STUDENT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} placeholder="All statuses" />
        <Select label="Program" value={program} onChange={(e) => setProgram(e.target.value)} options={programs} placeholder="All programs" />
      </div>
      <ErrorBox message={error} />
      <Card padded={false} title={`${rows.length} students`} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name or ID…" />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "studentId", label: "Student ID", render: (s) => <Link className="font-mono font-medium text-navy-900 hover:underline" href={`/portal/students/${s._id}`}>{s.studentId}</Link> },
              { key: "name", label: "Name", render: (s) => `${s.firstName} ${s.lastName}` },
              { key: "program", label: "Program", render: (s) => s.program?.code },
              { key: "cohort", label: "Cohort" },
              { key: "studyMode", label: "Mode" },
              { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
            ]}
          />
        )}
      </Card>

      <Modal open={importing} onClose={() => { setImporting(false); setResult(null); }} title="Import students from Excel" wide>
        {!result ? (
          <ExcelUpload<ImportResult>
            endpoint="/students/import"
            templatePath="/students/template"
            templateLabel="Download student template"
            help={<>Download the template, fill one student per row (program codes are listed on the second sheet), then upload it. Each valid row creates a student record and a login account.</>}
            onDone={(r) => {
              setResult(r);
              reload();
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{result.created} created</Badge>
              {result.failed > 0 && <Badge tone="red">{result.failed} failed</Badge>}
            </div>
            {result.created > 0 && (
              <div>
                <Button variant="gold" onClick={downloadCredentials}>
                  ⬇ Download login credentials (CSV)
                </Button>
                <p className="mt-1 text-xs text-slate-500">Temporary passwords are shown only now. Students must change them at first sign-in.</p>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
              <DataTable
                rowKey={(r) => String(r.row)}
                rows={result.results}
                columns={[
                  { key: "row", label: "Row" },
                  { key: "name", label: "Name" },
                  { key: "ok", label: "Result", render: (r) => (r.ok ? <Badge tone="green">{r.studentId}</Badge> : <span className="text-red-600">{r.message}</span>) },
                ]}
              />
            </div>
            <div>
              <Button variant="secondary" onClick={() => setResult(null)}>
                Import another file
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New student"
        fields={[
          { name: "firstName", label: "First name", required: true },
          { name: "lastName", label: "Last name", required: true },
          { name: "program", label: "Program", type: "select", options: programs, required: true },
          { name: "studentId", label: "Student ID", hint: "Leave empty to generate automatically" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "gender", label: "Gender", type: "select", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }] },
          { name: "dateOfBirth", label: "Date of birth", type: "date" },
          { name: "cohort", label: "Cohort", placeholder: String(new Date().getFullYear()) },
          { name: "studyMode", label: "Study mode", type: "select", options: ["Regular", "Extension", "Distance", "Summer"].map((v) => ({ value: v, label: v })) },
          { name: "address", label: "Address", full: true },
        ]}
        initial={{ studyMode: "Regular" }}
        submit={async (v) => {
          const res = await api("/students", { body: v });
          setCreated(res.credentials);
          toast("Student created");
          reload();
        }}
      />
      <Modal open={!!created} onClose={() => setCreated(null)} title="Student account created" footer={<Button onClick={() => setCreated(null)}>Done</Button>}>
        <p className="rounded-lg bg-navy-50 p-3 font-mono text-sm">
          Student ID: {created?.studentId}
          <br />
          Username: {created?.username}
          <br />
          Password: {created?.password}
        </p>
      </Modal>
    </RequireRole>
  );
}
