"use client";

import Link from "next/link";
import { useMe } from "@/components/portal-shell";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "@/components/ui";
import { fmtDate, fmtDateTime, useApi } from "@/lib/client";
import { humanize } from "@/lib/roles";

type Dashboard = {
  panels: { title: string; stats: { label: string; value: string | number; href?: string; tone?: "default" | "warning" | "success" | "danger" }[] }[];
  activity: { _id: string; action: string; entity?: string; actorName?: string; createdAt: string; college?: { code: string } }[];
  today: { section: string; start: string; end: string; room?: string; name: string; course: { code: string; title: string } }[];
  currentSemester: { name: string; academicYear: string; registrationOpen: boolean; endDate?: string } | null;
};

export default function DashboardPage() {
  const me = useMe();
  const { data, error, loading } = useApi<Dashboard>("/dashboard");
  const announcements = useApi<{ items: { _id: string; title: string; body: string; createdAt: string; createdBy?: string }[] }>("/announcements");
  const firstName = me.user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          data?.currentSemester
            ? `Current semester: ${data.currentSemester.name} ${data.currentSemester.academicYear}${data.currentSemester.registrationOpen ? " · Registration is open" : ""}`
            : "Here is what needs your attention today."
        }
      />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}

      <div className="flex flex-col gap-8">
        {data?.panels.map((panel) => (
          <section key={panel.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{panel.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {panel.stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </section>
        ))}

        {data && !data.panels.length && (
          <Card>
            <p className="text-sm text-slate-600">No roles are assigned to your account in this college yet. Contact your college administrator.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {!!data?.today.length && (
            <Card title="Today's classes">
              <ul className="divide-y divide-slate-100">
                {data.today.map((c, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/portal/teaching/${c.section}`} className="font-medium text-navy-900 hover:underline">
                      {c.course.code} · Section {c.name}
                    </Link>
                    <span className="text-slate-500">
                      {c.start}–{c.end} {c.room && `· ${c.room}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Announcements" actions={<Link href="/portal/announcements" className="text-sm text-navy-500 hover:underline">View all</Link>}>
            {announcements.data?.items.length ? (
              <ul className="flex flex-col gap-4">
                {announcements.data.items.slice(0, 4).map((a) => (
                  <li key={a._id}>
                    <p className="font-medium text-navy-900">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">{a.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {fmtDate(a.createdAt)} {a.createdBy && `· ${a.createdBy}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No announcements right now.</p>
            )}
          </Card>

          {!!data?.activity.length && (
            <Card title="Recent activity" actions={<Link href="/portal/audit" className="text-sm text-navy-500 hover:underline">Audit log</Link>}>
              <ul className="flex flex-col gap-2 text-sm">
                {data.activity.map((a) => (
                  <li key={a._id} className="flex justify-between gap-3">
                    <span>
                      <b className="text-navy-900">{a.actorName}</b> · {humanize(a.action)} {a.entity && <span className="text-slate-400">({a.entity})</span>}
                      {a.college && <span className="ml-1 text-xs text-gold-700">{a.college.code}</span>}
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
