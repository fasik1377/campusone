"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewComplaintModal } from "@/components/complaints";
import { RequireRole } from "@/components/portal-shell";
import { TranscriptView, type TranscriptCourse } from "@/components/transcript";
import { ErrorBox, Loading, Notice, PageHeader, StatCard, useToast } from "@/components/ui";
import { useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MyGradesPage() {
  const { data, error, loading } = useApi<any>("/me/student");
  const complaints = useApi<{ items: { gradeEntry?: string; status: string }[] }>("/complaints");
  const [appealing, setAppealing] = useState<TranscriptCourse | null>(null);
  const router = useRouter();
  const toast = useToast();
  const t = data?.transcript;
  const program = data?.student?.program;
  const progress = t && program?.totalCredits ? Math.min(100, Math.round((t.creditsEarned / program.totalCredits) * 100)) : 0;
  // Grades that already have an open appeal show "Appeal open" instead of the button.
  const appealed = useMemo(
    () => new Set((complaints.data?.items ?? []).filter((c) => c.gradeEntry && (c.status === "submitted" || c.status === "under_review")).map((c) => String(c.gradeEntry))),
    [complaints.data],
  );

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
            <div className="h-full bg-gold-500 transition-[width] duration-1000" style={{ width: `${progress}%` }} />
          </div>
          {!!t.semesters.length && (
            <div className="no-print mb-4">
              <Notice>Think a grade is wrong? Choose <b>Report a problem</b> next to the course to open an appeal with the registrar.</Notice>
            </div>
          )}
          <TranscriptView transcript={t} student={data.student} onAppeal={setAppealing} appealed={appealed} />
        </>
      )}
      <NewComplaintModal
        open={!!appealing}
        onClose={() => setAppealing(null)}
        grade={appealing && appealing.entryId ? { entryId: appealing.entryId, code: appealing.code, title: appealing.title, letter: appealing.letter, total: appealing.total } : null}
        onCreated={() => {
          toast("Appeal submitted — you can follow it under Complaints");
          router.push("/portal/my/complaints");
        }}
      />
    </RequireRole>
  );
}
