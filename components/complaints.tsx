"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api, fmtDateTime, useApi } from "@/lib/client";
import { COMPLAINT_CATEGORIES, COMPLAINT_CATEGORY_LABELS } from "@/lib/roles";
import { Badge, Button, cx, ErrorBox, Input, Loading, Modal, Select, StatusBadge, Textarea, useToast } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ComplaintSummary = {
  _id: string;
  ticketNumber: string;
  category: (typeof COMPLAINT_CATEGORIES)[number];
  subject: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  studentUnread?: boolean;
  staffUnread?: boolean;
  student?: { studentId: string; firstName: string; lastName: string };
  course?: { code: string; title: string };
};

export const categoryLabel = (c: string) => COMPLAINT_CATEGORY_LABELS[c as keyof typeof COMPLAINT_CATEGORY_LABELS] ?? c;

/** One row in a complaints list; bold with a dot when there is an unread reply. */
export function ComplaintRow({ c, active, unread, onClick, showStudent }: { c: ComplaintSummary; active: boolean; unread: boolean; onClick: () => void; showStudent?: boolean }) {
  return (
    <button onClick={onClick} className={cx("w-full rounded-xl border p-4 text-left transition", active ? "border-navy-500 bg-navy-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{c.ticketNumber}</span>
        <StatusBadge status={c.status} />
      </div>
      <p className={cx("mt-1.5 flex items-center gap-2 text-sm text-navy-900", unread ? "font-bold" : "font-medium")}>
        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-label="New reply" />}
        <span className="truncate">{c.subject}</span>
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">
        {categoryLabel(c.category)}
        {c.course && ` · ${c.course.code}`}
        {showStudent && c.student && ` · ${c.student.studentId} ${c.student.firstName} ${c.student.lastName}`}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">Updated {fmtDateTime(c.updatedAt)}</p>
    </button>
  );
}

/** Complaint detail: grade under appeal, the conversation, a reply box, and (for the registrar) the decision controls. */
export function ComplaintThread({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { data, error, loading, reload } = useApi<{ item: any; asStudent: boolean; canDecide: boolean }>(`/complaints/${id}`);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState<"resolved" | "rejected" | null>(null);
  const [resolution, setResolution] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [data]);
  // Opening the thread clears its unread marker, so refresh the list once it has loaded.
  useEffect(() => {
    if (data) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Could not load this complaint."} />;
  const c = data.item;
  const closed = c.status === "resolved" || c.status === "rejected";
  const g = c.gradeEntry;

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api(`/complaints/${id}`, { body: { body: reply } });
      setReply("");
      reload();
      onChanged();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  async function decide(status: "under_review" | "resolved" | "rejected", text?: string) {
    try {
      await api(`/complaints/${id}`, { method: "PATCH", body: { status, resolution: text } });
      toast(status === "under_review" ? "Marked as under review" : `Complaint ${status}`);
      setDeciding(null);
      setResolution("");
      reload();
      onChanged();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{c.ticketNumber}</span>
          <StatusBadge status={c.status} />
          <Badge tone="blue">{categoryLabel(c.category)}</Badge>
        </div>
        <h2 className="mt-2 text-xl font-bold text-navy-900">{c.subject}</h2>
        {!data.asStudent && c.student && (
          <p className="mt-1 text-sm text-slate-600">
            From <b className="text-navy-900">{c.student.firstName} {c.student.lastName}</b> ({c.student.studentId}
            {c.student.program && ` · ${c.student.program.code}`})
          </p>
        )}
        {c.course && (
          <p className="mt-1 text-sm text-slate-600">
            Course: <b className="text-navy-900">{c.course.code}</b> {c.course.title}
            {c.section?.instructor && ` · Instructor ${c.section.instructor.name}`}
          </p>
        )}
      </header>

      {g && (
        <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Grade under appeal · {g.semester?.name} {g.semester?.academicYear}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p>
              <span className="text-3xl font-bold text-navy-900">{g.letter}</span>
              <span className="ml-2 text-sm text-slate-600">{g.total} / 100</span>
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {Object.entries(g.scores ?? {}).map(([k, v]) => (
                <li key={k}>
                  {k}: <b className="text-navy-900">{v as number}</b>
                </li>
              ))}
            </ul>
          </div>
          {!!g.history?.length && <p className="mt-2 text-xs text-slate-500">This grade has been corrected {g.history.length} time(s) before.</p>}
          {data.canDecide && c.section && !closed && (
            <Link href={`/portal/teaching/${c.section._id}?tab=grades`} className="mt-3 inline-flex text-sm font-semibold text-navy-600 hover:underline">
              Open the mark sheet to correct this grade →
            </Link>
          )}
        </div>
      )}

      <ol className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-label="Conversation">
        <AnimatePresence initial={false}>
          {c.messages.map((m: any, i: number) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.fromStudent === data.asStudent ? "self-end rounded-br-md bg-navy-900 text-white" : "self-start rounded-bl-md bg-slate-100 text-navy-900")}
            >
              <p className={cx("mb-1 text-xs", m.fromStudent === data.asStudent ? "text-navy-200" : "text-slate-500")}>
                {m.byName}
                {!m.fromStudent && " · Staff"} · {fmtDateTime(m.at)}
              </p>
              <p className="whitespace-pre-line">{m.body}</p>
            </motion.li>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </ol>

      {closed ? (
        <div className={cx("mt-4 rounded-xl p-4 text-sm", c.status === "resolved" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>
          <b>{c.status === "resolved" ? "Resolved" : "Closed"}</b> by {c.resolvedBy} on {fmtDateTime(c.resolvedAt)}. {data.asStudent && "If the problem continues, you can submit a new complaint."}
        </div>
      ) : (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Textarea label={data.asStudent ? "Add a message" : "Reply to the student"} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={data.asStudent ? "Add details or answer the staff's question…" : "Write a reply…"} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={send} loading={sending} disabled={!reply.trim()}>
              Send
            </Button>
            {data.canDecide && (
              <>
                {c.status === "submitted" && (
                  <Button variant="secondary" onClick={() => decide("under_review")}>
                    Mark under review
                  </Button>
                )}
                <Button variant="gold" className="ml-auto" onClick={() => setDeciding("resolved")}>
                  Resolve
                </Button>
                <Button variant="ghost" className="text-red-600" onClick={() => setDeciding("rejected")}>
                  Close without change
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        title={deciding === "resolved" ? "Resolve complaint" : "Close without change"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button variant={deciding === "resolved" ? "primary" : "danger"} disabled={!resolution.trim()} onClick={() => deciding && decide(deciding, resolution)}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          {deciding === "resolved"
            ? "Explain what was done (for a grade appeal, correct the grade on the mark sheet first so the change is recorded)."
            : "Explain to the student why no change is being made."}
        </p>
        <Textarea label="Message to the student" required value={resolution} onChange={(e) => setResolution(e.target.value)} />
      </Modal>
    </div>
  );
}

/** Form a student uses to file a complaint; pass `grade` to appeal one specific result. */
export function NewComplaintModal({
  open,
  onClose,
  onCreated,
  grade,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  grade?: { entryId: string; code: string; title: string; letter?: string; total?: number } | null;
}) {
  const [category, setCategory] = useState<string>("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCategory(grade ? "grade" : "other");
    setSubject(grade ? `Grade appeal: ${grade.code} ${grade.title}` : "");
    setDescription("");
  }, [open, grade]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await api("/complaints", { body: { category, subject, description, gradeEntry: grade?.entryId } });
      onCreated(res.item._id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={grade ? "Appeal a grade" : "Submit a complaint"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!subject.trim() || description.trim().length < 10}>
            Submit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBox message={error} />
        {grade ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-navy-900">
              {grade.code} · {grade.title}
            </p>
            <p className="text-slate-600">
              Published grade: <b>{grade.letter}</b> ({grade.total} / 100)
            </p>
          </div>
        ) : (
          <Select
            label="What is it about?"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={COMPLAINT_CATEGORIES.filter((c) => c !== "grade").map((c) => ({ value: c, label: categoryLabel(c) }))}
            hint="To appeal a grade, use “Report a problem” next to that course on your Grades page."
          />
        )}
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea
          label="Describe the problem"
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint={grade ? "Say which assessment you think is wrong and why (e.g. a missing midterm mark). At least 10 characters." : "Include dates, names and any reference numbers. At least 10 characters."}
        />
        <p className="text-xs text-slate-500">The registrar will reply here. You&apos;ll see a notification when they do.</p>
      </div>
    </Modal>
  );
}
