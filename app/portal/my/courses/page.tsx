"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icons";
import { RequireRole } from "@/components/portal-shell";
import { Card, cx, DataTable, Empty, ErrorBox, Loading, PageHeader, StatusBadge } from "@/components/ui";
import { useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ease = [0.22, 1, 0.36, 1] as const;

export default function MyCoursesPage() {
  const { data, error, loading } = useApi<any>("/me/student");
  const regs: any[] = data?.registrations ?? [];
  const current = regs.filter((r) => r.semester?.isCurrent && (r.status === "approved" || r.status === "pending"));
  const attendance = new Map<string, any>((data?.attendance ?? []).map((a: any) => [String(a.section), a]));
  // Published grades keyed by section, so a current course can show its result once released.
  const grades = new Map<string, any>();
  for (const s of data?.transcript?.semesters ?? []) for (const c of s.courses) grades.set(String(c.section), { ...c, semester: s.semester });
  const completed = (data?.transcript?.semesters ?? []).flatMap((s: any) => s.courses.map((c: any) => ({ ...c, semester: s.semester })));
  const credits = current.filter((r) => r.status === "approved").reduce((s, r) => s + (r.course?.credits ?? 0), 0);

  return (
    <RequireRole roles={["student"]}>
      <PageHeader
        title="My courses"
        description={data?.currentSemester ? `${data.currentSemester.name} ${data.currentSemester.academicYear} · ${credits} registered credits` : undefined}
        actions={
          <Link href="/portal/my/registration" className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            <Icon name="plus" className="h-4 w-4" /> Add courses
          </Link>
        }
      />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}

      {data && !current.length && (
        <Card>
          <Empty title="No courses this semester">
            <Link href="/portal/my/registration" className="font-medium text-navy-600 hover:underline">
              Register for courses
            </Link>{" "}
            while registration is open.
          </Empty>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {current.map((r, i) => {
          const att = attendance.get(String(r.section?._id));
          const grade = grades.get(String(r.section?._id));
          const pct = att?.percent;
          return (
            <motion.article
              key={r._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease }}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative bg-navy-900 px-5 py-4 text-white">
                <div className="bg-grid absolute inset-0 opacity-60" />
                <div className="relative flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-gold-400">{r.course?.code}</p>
                    <h2 className="mt-0.5 font-semibold leading-snug">{r.course?.title}</h2>
                  </div>
                  {grade ? (
                    <span className="rounded-xl bg-white px-3 py-1.5 text-lg font-bold text-navy-900">{grade.letter}</span>
                  ) : (
                    r.status === "pending" && <StatusBadge status="pending" />
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5 text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                  <Icon name="admissions" className="h-4 w-4 text-slate-400" /> {r.section?.instructor?.name ?? "Instructor to be announced"} · Section {r.section?.name}
                </p>
                <p className="flex items-start gap-2 text-slate-600">
                  <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {(r.section?.schedule ?? []).map((s: any) => `${s.day} ${s.start}–${s.end}${s.room ? ` (${s.room})` : ""}`).join(", ") || "Schedule to be announced"}
                </p>
                <div className="mt-auto pt-2">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">Attendance</span>
                    <span className={cx("font-semibold", pct === null || pct === undefined ? "text-slate-400" : pct < 75 ? "text-red-700" : "text-emerald-700")}>
                      {pct === null || pct === undefined ? "No sessions yet" : `${pct}% (${att.attended}/${att.total})`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div className={cx("h-full rounded-full", pct !== undefined && pct !== null && pct < 75 ? "bg-red-500" : "bg-emerald-500")} initial={{ width: 0 }} animate={{ width: `${pct ?? 0}%` }} transition={{ duration: 0.9, ease }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {r.course?.credits} credits{grade ? ` · Final ${grade.total}/100` : " · Grade not yet published"}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {!!completed.length && (
        <Card title="Completed courses" className="mt-8" padded={false} actions={<Link href="/portal/my/grades" className="text-sm font-medium text-navy-600 hover:underline">Full transcript →</Link>}>
          <DataTable
            rowKey={(c: any) => c.entryId ?? c.code + c.semester}
            rows={completed}
            columns={[
              { key: "semester", label: "Semester" },
              { key: "code", label: "Code", render: (c: any) => <span className="font-mono">{c.code}</span> },
              { key: "title", label: "Course" },
              { key: "credits", label: "Credits" },
              { key: "letter", label: "Grade", render: (c: any) => <b className={c.letter === "F" ? "text-red-600" : "text-navy-900"}>{c.letter}</b> },
            ]}
          />
        </Card>
      )}
    </RequireRole>
  );
}
