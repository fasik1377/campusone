"use client";

import Link from "next/link";
import { RequireRole } from "@/components/portal-shell";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, StatusBadge } from "@/components/ui";
import { useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function TeachingPage() {
  const { data, error, loading } = useApi<{ items: any[] }>("/teaching");
  return (
    <RequireRole roles={["instructor"]}>
      <PageHeader title="My teaching" description="Your assigned sections. Open one to take attendance, enter marks, or use the Excel grade sheet." />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && !data.items.length && (
        <Card>
          <Empty title="No sections assigned yet">Your department assigns sections each semester.</Empty>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((s) => (
          <Link key={s._id} href={`/portal/teaching/${s._id}`} className="group">
            <Card className="h-full transition group-hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-gold-700">{s.course?.code}</p>
                  <h2 className="font-semibold text-navy-900">{s.course?.title}</h2>
                  <p className="text-sm text-slate-500">
                    Section {s.name} · {s.semester?.name} {s.semester?.academicYear}
                  </p>
                </div>
                {s.semester?.isCurrent && <Badge tone="gold">Current</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>
                  <b className="text-navy-900">{s.enrolled}</b> / {s.capacity} students
                </span>
                <span>Grades: <StatusBadge status={s.gradeStatus} /></span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{(s.schedule ?? []).map((x: any) => `${x.day} ${x.start}-${x.end}${x.room ? ` ${x.room}` : ""}`).join(" · ")}</p>
            </Card>
          </Link>
        ))}
      </div>
    </RequireRole>
  );
}
