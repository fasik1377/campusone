"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { fmtDateTime, useApi } from "@/lib/client";
import { humanize, ROLE_LABELS, type Role } from "@/lib/roles";
import { BarList, ChartCard, compact, Legend, LineChart, Meter, SERIES, Sparkline } from "./charts";
import { Icon, type IconName } from "./icons";
import { useMe } from "./portal-shell";
import { collegeLogo } from "./site";
import { cx, ErrorBox, Loading, StatusBadge } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Overview = {
  days: number;
  dates: string[];
  series: { signIns: number[]; otherActions: number[]; newUsers: number[]; newApplications: number[] };
  period: Record<"signIns" | "newUsers" | "applications", { current: number; previous: number }>;
  totals: { users: number; activeUsers: number; superAdmins: number; mustChange: number; disabled: number; colleges: Record<string, number> };
  usersByRole: { role: Role; count: number }[];
  applicationsByStatus: Record<string, number>;
  colleges: any[];
  health: { dbLatency: number; files: number; fileBytes: number; checkedAt: string };
  recent: any[];
};

const ease = [0.22, 1, 0.36, 1] as const;
const RANGES = [7, 30, 90] as const;
const PIPELINE = ["submitted", "under_review", "info_required", "waitlisted", "accepted", "rejected"];

const ACTION_ICON: Record<string, IconName> = { login: "shield", create_user: "admissions", create_college: "building", update_website_content: "spark", create_announcement: "spark" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const last = useRef(0);
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(last.current, value, { duration: 1.2, ease, onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString()) });
    last.current = value;
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{value.toLocaleString()}</span>;
}

/** Signed change vs the previous period. Up is good for every metric shown here. */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return <span className="text-xs text-slate-400">No activity in either period</span>;
  if (!previous) return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">▲ New this period</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium", up ? "text-emerald-700" : "text-red-700")}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-normal text-slate-500">vs previous period</span>
    </span>
  );
}

export function SuperAdminDashboard() {
  const me = useMe();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [live, setLive] = useState(true);
  const { data, error, loading, reload } = useApi<Overview>(`/admin/overview?days=${days}`);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [live, reload]);

  const firstName = me.user.name.split(" ")[0];
  const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome band */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-7 text-white shadow-xl sm:px-8"
      >
        <div className="bg-grid absolute inset-0 opacity-70" />
        <motion.div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gold-500/25 blur-3xl" animate={{ scale: [1, 1.15, 1], x: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">Super Admin · Platform control</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-navy-100">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {data && ` · ${data.totals.colleges.active} active ${data.totals.colleges.active === 1 ? "college" : "colleges"} · ${data.totals.activeUsers.toLocaleString()} active accounts`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["/portal/users", "New user", "admissions"],
                ["/portal/colleges", "Colleges", "building"],
                ["/portal/site", "Website", "spark"],
                ["/portal/announcements", "Announce", "registration"],
              ] as const
            ).map(([href, label, icon], i) => (
              <motion.div key={href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} whileHover={{ y: -3 }}>
                <Link href={href} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/20">
                  <Icon name={icon} className="h-4 w-4 text-gold-400" />
                  {label}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Filters: one row, scoping everything below */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="radiogroup" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={days === r}
              onClick={() => setDays(r)}
              className={cx("relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors", days === r ? "text-white" : "text-slate-600 hover:text-navy-900")}
            >
              {days === r && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-lg bg-navy-900" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">Last {r} days</span>
            </button>
          ))}
        </div>
        <button onClick={() => setLive((l) => !l)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:text-navy-900" aria-pressed={live}>
          <span className="relative flex h-2 w-2">
            {live && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />}
            <span className={cx("relative inline-flex h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-slate-300")} />
          </span>
          {live ? "Live · refreshes every minute" : "Live updates paused"}
        </button>
        {updatedAt && <span className="text-xs text-slate-400">Updated {updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
        <button onClick={reload} className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50" disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      <ErrorBox message={error} />
      {!data && loading && <Loading label="Loading platform analytics…" />}

      {data && (
        <div className={cx("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          {/* Headline numbers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active accounts</p>
              <p className="mt-1 text-5xl font-bold tracking-tight text-navy-900">
                <CountUp value={data.totals.activeUsers} />
              </p>
              <div className="mt-3">
                <Meter value={data.totals.activeUsers} max={Math.max(1, data.totals.users)} label="Active share of all accounts" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {data.totals.users.toLocaleString()} total · {data.totals.disabled} disabled
              </p>
            </motion.div>
            {(
              [
                ["Sign-ins", data.period.signIns, data.series.signIns, SERIES[0]],
                ["New accounts", data.period.newUsers, data.series.newUsers, SERIES[0]],
                ["Applications received", data.period.applications, data.series.newApplications, SERIES[1]],
              ] as const
            ).map(([label, p, s, color], i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * (i + 1), ease }} whileHover={{ y: -3 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-500">{label}</p>
                  <Sparkline values={s} color={color} width={96} height={28} />
                </div>
                <p className="mt-1 text-3xl font-semibold text-navy-900">
                  <CountUp value={p.current} />
                </p>
                <div className="mt-2">
                  <Delta current={p.current} previous={p.previous} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activity trend + users by role */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Platform activity"
              subtitle={`Events per day, last ${data.days} days · hover or use arrow keys for daily values`}
              legend={<Legend items={[{ label: "Sign-ins", color: SERIES[0] }, { label: "Other actions", color: SERIES[1] }]} />}
              table={{ headers: ["Date", "Sign-ins", "Other actions"], rows: data.dates.map((d, i) => [d, data.series.signIns[i], data.series.otherActions[i]]).reverse() }}
            >
              <LineChart
                dates={data.dates}
                dim={loading}
                series={[
                  { label: "Sign-ins", values: data.series.signIns, color: SERIES[0] },
                  { label: "Other actions", values: data.series.otherActions, color: SERIES[1] },
                ]}
              />
              <p className="mt-2 text-xs text-slate-500">
                {sum(data.series.signIns).toLocaleString()} sign-ins and {sum(data.series.otherActions).toLocaleString()} other recorded actions in this period.
              </p>
            </ChartCard>

            <ChartCard
              title="Accounts by role"
              subtitle="Active accounts; a person with two roles counts in both"
              table={{ headers: ["Role", "Accounts"], rows: data.usersByRole.map((r) => [ROLE_LABELS[r.role] ?? r.role, r.count]) }}
            >
              {data.usersByRole.length ? (
                <BarList items={[{ label: "Super Admin", value: data.totals.superAdmins }, ...data.usersByRole.map((r) => ({ label: ROLE_LABELS[r.role] ?? r.role, value: r.count }))]} />
              ) : (
                <p className="text-sm text-slate-500">No college accounts yet.</p>
              )}
              <Link href="/portal/users" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:underline">
                Manage users & roles <Icon name="arrow" className="h-3 w-3" />
              </Link>
            </ChartCard>
          </div>

          {/* Colleges + admissions pipeline */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-navy-900">Colleges</h2>
                  <p className="text-xs text-slate-500">
                    {Object.entries(data.totals.colleges)
                      .filter(([, n]) => n)
                      .map(([s, n]) => `${n} ${humanize(s).toLowerCase()}`)
                      .join(" · ")}
                  </p>
                </div>
                <Link href="/portal/colleges" className="text-xs font-semibold text-navy-600 hover:underline">
                  Manage colleges
                </Link>
              </header>
              <ul className="flex flex-col gap-3">
                {data.colleges.map((c, i) => (
                  <motion.li key={c._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, ease }}>
                    <Link
                      href={`/portal/colleges/${c._id}`}
                      className={cx("grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl border p-3 transition hover:border-slate-300 hover:shadow-md sm:grid-cols-[auto_1fr_auto]", c.status === "active" ? "border-slate-200" : "border-dashed border-slate-200 opacity-70")}
                    >
                      <Image src={collegeLogo(c.logoFileId)} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-xl border border-slate-100 object-contain p-1" style={{ boxShadow: c.brandColor ? `inset 0 -3px 0 ${c.brandColor}` : undefined }} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-navy-900">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.code} · last activity {c.lastActivity ? fmtDateTime(c.lastActivity) : "—"}
                        </p>
                      </div>
                      <dl className="col-span-2 grid grid-cols-4 gap-4 text-center sm:col-span-1">
                        {[
                          ["Students", c.students],
                          ["Staff", c.staff],
                          ["Programs", c.programs],
                          ["Pending apps", c.pendingApplications],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dd className="text-lg font-semibold tabular-nums text-navy-900">{compact(v as number)}</dd>
                            <dt className="text-[11px] text-slate-500">{k}</dt>
                          </div>
                        ))}
                      </dl>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </section>

            <ChartCard
              title="Admissions pipeline"
              subtitle="All applications by current status"
              table={{ headers: ["Status", "Applications"], rows: PIPELINE.map((s) => [humanize(s), data.applicationsByStatus[s] ?? 0]) }}
            >
              <BarList color={SERIES[1]} items={PIPELINE.map((s) => ({ label: humanize(s), value: data.applicationsByStatus[s] ?? 0 }))} />
              <p className="mt-3 text-xs text-slate-500">{Object.values(data.applicationsByStatus).reduce((a, b) => a + b, 0).toLocaleString()} applications in total.</p>
            </ChartCard>
          </div>

          {/* Health + activity feed */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-navy-900">Platform health</h2>
              <ul className="flex flex-col gap-4 text-sm">
                <HealthRow
                  ok={data.health.dbLatency < 300}
                  label="Database"
                  value={`${data.health.dbLatency} ms`}
                  detail={data.health.dbLatency < 300 ? "Responding normally" : "Slow response — check Atlas"}
                />
                <HealthRow ok label="File storage" value={bytes(data.health.fileBytes)} detail={`${data.health.files.toLocaleString()} files (logos & documents)`} />
                <HealthRow
                  ok={data.totals.mustChange === 0}
                  warn
                  label="Pending first sign-ins"
                  value={String(data.totals.mustChange)}
                  detail={data.totals.mustChange ? "Accounts still using an admin-set password" : "Every account has set its own password"}
                />
                <HealthRow ok={data.totals.colleges.suspended === 0} warn label="Suspended colleges" value={String(data.totals.colleges.suspended)} detail={data.totals.colleges.suspended ? "Users of these colleges cannot sign in" : "None"} />
              </ul>
              <p className="mt-4 text-[11px] text-slate-400">Checked {fmtDateTime(data.health.checkedAt)}</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-navy-900">Live activity</h2>
                <Link href="/portal/audit" className="text-xs font-semibold text-navy-600 hover:underline">
                  Full audit log
                </Link>
              </header>
              <ol className="relative flex flex-col gap-1 border-l border-slate-200 pl-5">
                <AnimatePresence initial={false}>
                  {data.recent.map((a) => (
                    <motion.li key={a._id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="relative py-1.5">
                      <span className="absolute top-2.5 -left-[29px] flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                        <Icon name={ACTION_ICON[a.action] ?? "check"} className="h-2.5 w-2.5 text-navy-500" />
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <p>
                          <b className="font-medium text-navy-900">{a.actorName}</b> <span className="text-slate-600">{humanize(a.action).toLowerCase()}</span>
                          {a.college && <span className="ml-1.5 rounded bg-gold-50 px-1.5 py-0.5 text-[11px] font-medium text-gold-700">{a.college.code}</span>}
                        </p>
                        <time className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</time>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/** Status always pairs an icon and words with its colour, never colour alone. */
function HealthRow({ ok, warn, label, value, detail }: { ok: boolean; warn?: boolean; label: string; value: string; detail: string }) {
  const tone = ok ? "text-emerald-700 bg-emerald-50" : warn ? "text-amber-800 bg-amber-50" : "text-red-700 bg-red-50";
  return (
    <li className="flex items-start gap-3">
      <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", tone)} aria-hidden>
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-navy-900">{label}</span>
          <span className="font-semibold tabular-nums text-navy-900">{value}</span>
        </p>
        <p className="text-xs text-slate-500">
          <span className="sr-only">{ok ? "OK: " : "Attention: "}</span>
          {detail}
        </p>
      </div>
    </li>
  );
}
