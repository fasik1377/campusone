"use client";

import { RequireRole } from "@/components/portal-shell";
import { TranscriptView } from "@/components/transcript";
import { ErrorBox, Loading, PageHeader, StatCard } from "@/components/ui";
import { useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MyGradesPage() {
  const { data, error, loading } = useApi<any>("/me/student");
  const t = data?.transcript;
  const program = data?.student?.program;
  const progress = t && program?.totalCredits ? Math.min(100, Math.round((t.creditsEarned / program.totalCredits) * 100)) : 0;

  return (
    <RequireRole roles={["student"]}>
      <PageHeader title="Grades & transcript" description="Published results only. Grades appear after departmental approval and registrar publication." actions={<button className="no-print text-sm text-navy-500 hover:underline" onClick={() => window.print()}>Print transcript</button>} />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {t && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Cumulative GPA" value={t.cgpa.toFixed(2)} tone={t.cgpa && t.cgpa < 2 ? "danger" : "success"} />
            <StatCard label="Credits earned" value={`${t.creditsEarned} / ${program?.totalCredits ?? "—"}`} />
            <StatCard label="Academic standing" value={t.standing} />
            <StatCard label="Graduation progress" value={`${progress}%`} />
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gold-500" style={{ width: `${progress}%` }} />
          </div>
          <TranscriptView transcript={t} student={data.student} />
        </>
      )}
    </RequireRole>
  );
}
