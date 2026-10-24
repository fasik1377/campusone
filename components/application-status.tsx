"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { Button, Card, ErrorBox, Input, StatusBadge } from "./ui";

type Status = { applicationNumber: string; firstName: string; status: string; program: string; college: string; submittedAt: string; message?: string };

const EXPLAIN: Record<string, string> = {
  submitted: "Your application has been received and is waiting for review.",
  under_review: "Admissions staff are reviewing your application and documents.",
  info_required: "The college needs more information from you. See the message below and contact the admissions office.",
  waitlisted: "You are on the waiting list. You will be contacted if a place becomes available.",
  accepted: "Congratulations! You have been admitted. The registrar will give you your student ID and portal login.",
  rejected: "Unfortunately your application was not successful this time.",
};

export function ApplicationStatus() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("number") ?? "");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<Status>(`/public/application-status?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Check your application status">
      <form onSubmit={check} className="flex flex-col gap-4">
        <Input label="Application number" required placeholder="APP-XXX-2026-00001" value={number} onChange={(e) => setNumber(e.target.value)} />
        <Input label="Email used in the application" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Button type="submit" loading={busy}>
            Check status
          </Button>
        </div>
        <ErrorBox message={error} />
      </form>
      {result && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-semibold text-navy-900">{result.applicationNumber}</p>
            <StatusBadge status={result.status} />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {result.firstName}, {result.program} at {result.college}. Submitted {fmtDate(result.submittedAt)}.
          </p>
          <p className="mt-2 text-sm text-slate-600">{EXPLAIN[result.status]}</p>
          {result.message && <p className="mt-2 rounded bg-white p-3 text-sm text-navy-900">“{result.message}”</p>}
        </div>
      )}
    </Card>
  );
}
