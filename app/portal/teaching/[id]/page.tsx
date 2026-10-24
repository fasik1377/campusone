"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DownloadButton, ExcelUpload } from "@/components/excel";
import { RequireRole, useMe } from "@/components/portal-shell";
import { Badge, Button, Card, DataTable, ErrorBox, inputClass, Input, Loading, Modal, Notice, PageHeader, StatusBadge, Tabs, Textarea, useConfirm, useToast } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";
import { ATTENDANCE_STATUSES, humanize } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Student = { _id: string; studentId: string; firstName: string; lastName: string; email?: string; status: string };
type Tab = "students" | "attendance" | "grades";

export default function SectionWorkspacePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>((search.get("tab") as Tab) ?? "students");
  const roster = useApi<{ section: any; students: Student[]; isInstructor: boolean }>(`/sections/${id}/roster`);
  const section = roster.data?.section;

  return (
    <RequireRole roles={["instructor", "registrar", "college_admin", "dean", "department_head"]}>
      <ErrorBox message={roster.error} />
      {roster.loading && !roster.data && <Loading />}
      {section && (
        <>
          <PageHeader
            back={roster.data!.isInstructor ? { href: "/portal/teaching", label: "My teaching" } : { href: "/portal/grade-approvals", label: "Grade approvals" }}
            title={`${section.course.code} — ${section.course.title}`}
            description={`Section ${section.name} · ${section.semester.name} ${section.semester.academicYear} · ${section.instructor?.name ?? "No instructor"} · ${roster.data!.students.length} students`}
          />
          <Tabs
            tabs={[
              { key: "students", label: "Class list" },
              { key: "attendance", label: "Attendance" },
              { key: "grades", label: "Grades" },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "students" && <ClassList id={id} students={roster.data!.students} />}
          {tab === "attendance" && <AttendanceTab id={id} canEdit={roster.data!.isInstructor} />}
          {tab === "grades" && <GradesTab id={id} />}
        </>
      )}
    </RequireRole>
  );
}

function ClassList({ id, students }: { id: string; students: Student[] }) {
  return (
    <Card padded={false} title={`${students.length} enrolled students`} actions={<DownloadButton path={`/sections/${id}/classlist`}>Class list (.xlsx)</DownloadButton>}>
      <DataTable
        rows={students}
        empty="No approved registrations for this section yet."
        columns={[
          { key: "studentId", label: "Student ID", render: (s) => <span className="font-mono">{s.studentId}</span> },
          { key: "name", label: "Name", render: (s) => `${s.firstName} ${s.lastName}` },
          { key: "email", label: "Email" },
          { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
        ]}
      />
    </Card>
  );
}

/* ------------------------------- Attendance ------------------------------- */

function AttendanceTab({ id, canEdit }: { id: string; canEdit: boolean }) {
  const { data, error, loading, reload } = useApi<{ sessions: any[]; students: Student[]; summary: { student: string; attended: number; total: number; percent: number | null }[] }>(`/sections/${id}/attendance`);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!data) return;
    const session = data.sessions.find((s) => s.date === date);
    setMarks(Object.fromEntries(data.students.map((s) => [s._id, session?.records.find((r: any) => r.student === s._id)?.status ?? "present"])));
  }, [data, date]);

  const existing = data?.sessions.find((s) => s.date === date);

  async function save() {
    setSaving(true);
    try {
      await api(`/sections/${id}/attendance`, { body: { date, records: Object.entries(marks).map(([student, status]) => ({ student, status })) } });
      toast(existing ? "Attendance corrected" : "Attendance saved");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  const summary = new Map(data!.summary.map((s) => [s.student, s]));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card
        className="xl:col-span-2"
        padded={false}
        title={
          <span className="flex items-center gap-3">
            Attendance for
            <input type="date" aria-label="Date" max={today} className={inputClass + " w-auto"} value={date} onChange={(e) => setDate(e.target.value)} />
            {existing && <Badge tone="blue">Recorded</Badge>}
          </span>
        }
        actions={
          canEdit && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setMarks(Object.fromEntries(Object.keys(marks).map((k) => [k, "present"])))}>
                All present
              </Button>
              <Button size="sm" onClick={save} loading={saving} disabled={!data!.students.length}>
                {existing ? "Save correction" : "Save attendance"}
              </Button>
            </>
          )
        }
      >
        <DataTable
          rows={data!.students}
          empty="No students enrolled."
          columns={[
            { key: "studentId", label: "Student", render: (s) => <><span className="font-mono">{s.studentId}</span> {s.firstName} {s.lastName}</> },
            {
              key: "status",
              label: "Status",
              render: (s) => (
                <div className="flex flex-wrap gap-1">
                  {ATTENDANCE_STATUSES.map((st) => (
                    <button
                      key={st}
                      disabled={!canEdit}
                      onClick={() => setMarks({ ...marks, [s._id]: st })}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition ${
                        marks[s._id] === st
                          ? { present: "bg-emerald-600 text-white ring-emerald-600", absent: "bg-red-600 text-white ring-red-600", late: "bg-amber-500 text-white ring-amber-500", excused: "bg-navy-600 text-white ring-navy-600" }[st]
                          : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {humanize(st)}
                    </button>
                  ))}
                </div>
              ),
            },
            {
              key: "pct",
              label: "Overall",
              render: (s) => {
                const x = summary.get(s._id);
                if (!x || x.percent === null) return "—";
                return <span className={x.percent < 75 ? "font-semibold text-red-600" : ""}>{x.percent}% ({x.attended}/{x.total})</span>;
              },
            },
          ]}
        />
      </Card>
      <Card title="Sessions" actions={<DownloadButton size="sm" path={`/sections/${id}/attendance/export`}>Excel</DownloadButton>}>
        <ul className="flex flex-col gap-1 text-sm">
          {data!.sessions.map((s) => {
            const absent = s.records.filter((r: any) => r.status === "absent").length;
            return (
              <li key={s._id}>
                <button className="flex w-full justify-between rounded px-2 py-1 hover:bg-slate-50" onClick={() => setDate(s.date)}>
                  <span className="font-medium text-navy-900">{s.date}</span>
                  <span className="text-slate-500">{absent} absent{s.corrections?.length ? " · corrected" : ""}</span>
                </button>
              </li>
            );
          })}
          {!data!.sessions.length && <li className="text-slate-500">No sessions recorded yet.</li>}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Students below 75% are highlighted in red.</p>
      </Card>
    </div>
  );
}

/* --------------------------------- Grades --------------------------------- */

function GradesTab({ id }: { id: string }) {
  const me = useMe();
  const { data, error, loading, reload } = useApi<{ section: any; isInstructor: boolean; students: Student[]; entries: any[] }>(`/sections/${id}/grades`);
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [correcting, setCorrecting] = useState<{ entry: any; student: Student } | null>(null);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    if (!data) return;
    setScores(Object.fromEntries(data.students.map((s) => {
      const e = data.entries.find((x) => x.student === s._id);
      return [s._id, Object.fromEntries(data.section.assessments.map((a: any) => [a.name, e?.scores?.[a.name] ?? ""]))];
    })));
  }, [data]);

  const entryFor = useMemo(() => new Map((data?.entries ?? []).map((e) => [e.student, e])), [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  const { section, isInstructor, students } = data!;
  const assessments: { name: string; weight: number }[] = section.assessments;
  const editable = isInstructor && (section.gradeStatus === "open" || section.gradeStatus === "returned");
  const reviewer = me.has("department_head", "dean");
  const registrar = me.has("registrar");

  const liveTotal = (sid: string) => {
    const row = scores[sid] ?? {};
    const vals = assessments.map((a) => row[a.name]).filter((v) => v !== "" && v !== undefined);
    return vals.length ? vals.reduce((s, v) => s + Number(v), 0) : null;
  };

  async function saveDraft(quiet = false) {
    setBusy("save");
    try {
      const entries = students.map((s) => ({
        student: s._id,
        scores: Object.fromEntries(assessments.map((a) => [a.name, scores[s._id]?.[a.name] === "" || scores[s._id]?.[a.name] === undefined ? null : Number(scores[s._id][a.name])])),
      }));
      await api(`/sections/${id}/grades`, { method: "PUT", body: { entries } });
      if (!quiet) toast("Draft saved");
      reload();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    const note = await ask({ title: "Submit grades for approval?", message: "After submission you cannot edit marks unless a reviewer returns them.", confirm: "Submit" });
    if (note === null) return;
    if (!(await saveDraft(true))) return;
    setBusy("submit");
    try {
      await api(`/sections/${id}/grades`, { body: { note } });
      toast("Grades submitted to the department");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function review(action: "approve" | "return" | "publish") {
    const note = await ask({
      title: action === "approve" ? "Approve grades?" : action === "publish" ? "Publish grades to students?" : "Return grades to the instructor?",
      message: action === "publish" ? "Students will immediately see these results and GPAs will update." : action === "return" ? "The instructor will be able to edit the marks again." : "The registrar will then be able to publish them.",
      reason: action === "return",
      danger: action === "return",
      confirm: humanize(action),
    });
    if (note === null) return;
    setBusy(action);
    try {
      await api(`/sections/${id}/grades/review`, { body: { action, note } });
      toast(`Grades ${action === "return" ? "returned" : action === "approve" ? "approved" : "published"}`);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-600">Status:</span> <StatusBadge status={section.gradeStatus} />
        <div className="ml-auto flex flex-wrap gap-2">
          <DownloadButton path={`/sections/${id}/grades/template`}>Grade sheet (.xlsx)</DownloadButton>
          {editable && (
            <>
              <Button variant="secondary" onClick={() => setUploading(true)}>
                ⬆ Upload Excel
              </Button>
              <Button variant="secondary" onClick={() => saveDraft()} loading={busy === "save"}>
                Save draft
              </Button>
              <Button variant="gold" onClick={submit} loading={busy === "submit"} disabled={!students.length}>
                Submit for approval
              </Button>
            </>
          )}
          {reviewer && section.gradeStatus === "submitted" && (
            <>
              <Button variant="danger" onClick={() => review("return")} loading={busy === "return"}>
                Return
              </Button>
              <Button onClick={() => review("approve")} loading={busy === "approve"}>
                Approve
              </Button>
            </>
          )}
          {registrar && section.gradeStatus === "approved" && (
            <>
              <Button variant="danger" onClick={() => review("return")} loading={busy === "return"}>
                Return
              </Button>
              <Button variant="gold" onClick={() => review("publish")} loading={busy === "publish"}>
                Publish to students
              </Button>
            </>
          )}
        </div>
      </div>
      {section.gradeStatus === "returned" && isInstructor && <Notice tone="amber">These grades were returned: {section.gradeLog?.at(-1)?.note}</Notice>}
      {isInstructor && !editable && section.gradeStatus !== "published" && <Notice>Grades are under review and locked.</Notice>}

      <Card padded={false} title={`Mark sheet — ${assessments.map((a) => `${a.name} ${a.weight}%`).join(" · ")}`}>
        <DataTable
          rows={students}
          empty="No students enrolled."
          columns={[
            { key: "studentId", label: "Student", render: (s) => <><span className="font-mono">{s.studentId}</span> <span className="whitespace-nowrap">{s.firstName} {s.lastName}</span></> },
            ...assessments.map((a) => ({
              key: a.name,
              label: `${a.name} /${a.weight}`,
              render: (s: Student) =>
                editable ? (
                  <input
                    type="number"
                    min={0}
                    max={a.weight}
                    step="0.25"
                    aria-label={`${a.name} for ${s.studentId}`}
                    className={`${inputClass} w-20 ${Number(scores[s._id]?.[a.name]) > a.weight ? "border-red-500" : ""}`}
                    value={scores[s._id]?.[a.name] ?? ""}
                    onChange={(e) => setScores({ ...scores, [s._id]: { ...scores[s._id], [a.name]: e.target.value } })}
                  />
                ) : (
                  (entryFor.get(s._id)?.scores?.[a.name] ?? "—")
                ),
            })),
            { key: "total", label: "Total", render: (s) => <b>{editable ? (liveTotal(s._id) ?? "—") : (entryFor.get(s._id)?.total ?? "—")}</b> },
            { key: "letter", label: "Grade", render: (s) => { const l = entryFor.get(s._id)?.letter; return l ? <b className={l === "F" ? "text-red-600" : "text-navy-900"}>{l}</b> : "—"; } },
            ...(registrar && section.gradeStatus === "published"
              ? [{ key: "fix", label: "", render: (s: Student) => entryFor.get(s._id) && <Button size="sm" variant="ghost" onClick={() => setCorrecting({ entry: entryFor.get(s._id), student: s })}>Correct</Button> }]
              : []),
          ]}
        />
      </Card>

      {!!section.gradeLog?.length && (
        <Card title="Approval history">
          <ol className="flex flex-col gap-2 border-l-2 border-gold-500 pl-4 text-sm">
            {[...section.gradeLog].reverse().map((l: any, i: number) => (
              <li key={i}>
                <StatusBadge status={l.action} /> <span className="text-slate-500">{l.byName} · {fmtDateTime(l.at)}</span>
                {l.note && <p className="text-slate-600">{l.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Modal open={uploading} onClose={() => setUploading(false)} title="Upload grade sheet">
        <ExcelUpload<{ saved: number }>
          endpoint={`/sections/${id}/grades/import`}
          templatePath={`/sections/${id}/grades/template`}
          templateLabel="Download grade sheet"
          help="Download the grade sheet (pre-filled with your class list), enter marks in the assessment columns, then upload it. Marks are validated and saved as a draft."
          onDone={(r) => {
            toast(`${r.saved} students' marks saved as draft`);
            setUploading(false);
            reload();
          }}
        />
      </Modal>
      {correcting && <CorrectionModal assessments={assessments} target={correcting} onClose={() => setCorrecting(null)} onDone={reload} />}
      {dialog}
    </div>
  );
}

function CorrectionModal({ assessments, target, onClose, onDone }: { assessments: { name: string; weight: number }[]; target: { entry: any; student: Student }; onClose: () => void; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(assessments.map((a) => [a.name, String(target.entry.scores?.[a.name] ?? "")])));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/grades/${target.entry._id}/correct`, { body: { reason, scores: Object.fromEntries(assessments.map((a) => [a.name, values[a.name] === "" ? null : Number(values[a.name])])) } });
      toast("Grade corrected; previous value kept in history");
      onClose();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Correct grade — ${target.student.studentId}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!reason.trim()}>Save correction</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <p className="text-sm text-slate-600">
          Current: total {target.entry.total}, grade <b>{target.entry.letter}</b>. The old values and your reason are stored permanently.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {assessments.map((a) => (
            <Input key={a.name} label={`${a.name} (/${a.weight})`} type="number" value={values[a.name]} onChange={(e) => setValues({ ...values, [a.name]: e.target.value })} />
          ))}
        </div>
        <Textarea label="Reason for correction" required value={reason} onChange={(e) => setReason(e.target.value)} />
        {!!target.entry.history?.length && (
          <div className="text-xs text-slate-500">
            Previous corrections:
            <ul className="list-disc pl-5">
              {target.entry.history.map((h: any, i: number) => (
                <li key={i}>{h.letter} ({h.total}) → changed by {h.by}: {h.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
