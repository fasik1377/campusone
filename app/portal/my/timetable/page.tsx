"use client";

import { RequireRole } from "@/components/portal-shell";
import { Card, DataTable, Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/client";
import { DAYS } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function TimetablePage() {
  const { data, error, loading } = useApi<any>("/me/student");
  const approved = (data?.registrations ?? []).filter((r: any) => r.status === "approved" && r.semester?.isCurrent);
  const slots = approved.flatMap((r: any) => (r.section?.schedule ?? []).map((s: any) => ({ ...s, course: r.course, instructor: r.section?.instructor?.name, section: r.section?.name })));
  const days = DAYS.filter((d) => slots.some((s: any) => s.day === d));
  const attendance = new Map((data?.attendance ?? []).map((a: any) => [String(a.section), a]));

  return (
    <RequireRole roles={["student"]}>
      <PageHeader title="Timetable & attendance" description={data?.currentSemester ? `${data.currentSemester.name} ${data.currentSemester.academicYear}` : undefined} actions={<button className="no-print text-sm text-navy-500 hover:underline" onClick={() => window.print()}>Print</button>} />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && !slots.length && (
        <Card>
          <Empty title="No classes scheduled">Your timetable appears once your registrations for the current semester are approved.</Empty>
        </Card>
      )}
      {!!slots.length && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => (
            <Card key={day} title={day}>
              <ul className="flex flex-col gap-3">
                {slots
                  .filter((s: any) => s.day === day)
                  .sort((a: any, b: any) => a.start.localeCompare(b.start))
                  .map((s: any, i: number) => (
                    <li key={i} className="border-l-4 border-gold-500 pl-3">
                      <p className="text-sm font-semibold text-navy-900">{s.start}–{s.end} · {s.course?.code}</p>
                      <p className="text-sm text-slate-600">{s.course?.title}</p>
                      <p className="text-xs text-slate-400">Room {s.room || "TBA"} · {s.instructor ?? "TBA"}</p>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      {!!approved.length && (
        <Card title="Attendance" padded={false}>
          <DataTable
            rows={approved}
            columns={[
              { key: "course", label: "Course", render: (r: any) => `${r.course?.code} — ${r.course?.title}` },
              { key: "sessions", label: "Sessions", render: (r: any) => (attendance.get(String(r.section?._id)) as any)?.total ?? 0 },
              { key: "attended", label: "Attended", render: (r: any) => (attendance.get(String(r.section?._id)) as any)?.attended ?? 0 },
              {
                key: "pct",
                label: "Rate",
                render: (r: any) => {
                  const a = attendance.get(String(r.section?._id)) as any;
                  if (!a || a.percent === null) return "—";
                  return <b className={a.percent < 75 ? "text-red-600" : "text-emerald-700"}>{a.percent}%</b>;
                },
              },
            ]}
          />
        </Card>
      )}
    </RequireRole>
  );
}
