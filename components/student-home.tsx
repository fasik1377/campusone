"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { fmtDate, useApi } from "@/lib/client";
import { DAYS, formatMoney } from "@/lib/roles";
import { Icon, type IconName } from "./icons";
import { useMe } from "./portal-shell";
import { collegeLogo } from "./site";
import { Card, cx, ErrorBox, Loading } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: i * 0.06, ease } });

const QUICK: { href: string; label: string; icon: IconName }[] = [
  { href: "/portal/my/registration", label: "Register courses", icon: "registration" },
  { href: "/portal/my/courses", label: "My courses", icon: "grades" },
  { href: "/portal/my/timetable", label: "Timetable", icon: "calendar" },
  { href: "/portal/my/finance", label: "Fees", icon: "finance" },
  { href: "/portal/my/requests", label: "Requests", icon: "excel" },
  { href: "/portal/my/complaints", label: "Complaints", icon: "shield" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Circular GPA gauge (0–4) that fills on load. */
function GpaRing({ value }: { value: number }) {
  const pct = Math.min(1, value / 4);
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#d6a84f" strokeWidth="9" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 1.2, ease }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-navy-900">{value.toFixed(2)}</span>
        <span className="text-[11px] text-slate-500">CGPA</span>
      </div>
    </div>
  );
}

export function StudentHome() {
  const me = useMe();
  const { data, error, loading } = useApi<any>("/me/student");
  const news = useApi<{ items: { _id: string; title: string; body: string; createdAt: string }[] }>("/announcements");

  if (error) return <ErrorBox message={error} />;
  if (loading && !data) return <Loading label="Opening your student portal…" />;
  if (!data) return null;

  const s = data.student;
  const sem = data.currentSemester;
  const t = data.transcript;
  const initials = `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`.toUpperCase();

  // Semester progress from its start and end dates.
  let semPct: number | null = null;
  let daysLeft: number | null = null;
  if (sem?.startDate && sem?.endDate) {
    const start = +new Date(sem.startDate);
    const end = +new Date(sem.endDate);
    semPct = Math.round(Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) * 100);
    daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  }

  const current = (data.registrations as any[]).filter((r) => r.semester?.isCurrent && r.status === "approved");
  const pending = (data.registrations as any[]).filter((r) => r.semester?.isCurrent && r.status === "pending").length;
  const today = DAYS[(new Date().getDay() + 6) % 7];
  const classes = current
    .flatMap((r) => (r.section?.schedule ?? []).filter((x: any) => x.day === today).map((x: any) => ({ ...x, course: r.course, instructor: r.section?.instructor?.name })))
    .sort((a: any, b: any) => a.start.localeCompare(b.start));
  const nowHM = new Date().toTimeString().slice(0, 5);
  const att = (data.attendance as any[]).filter((a) => a.percent !== null);
  const attAvg = att.length ? Math.round(att.reduce((sum, a) => sum + a.percent, 0) / att.length) : null;
  const totalCredits = s.program?.totalCredits ?? 0;
  const creditPct = totalCredits ? Math.min(100, Math.round((t.creditsEarned / totalCredits) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Profile card */}
      <motion.section {...rise()} className="relative overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-xl sm:p-8">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-500 text-2xl font-bold text-navy-900 shadow-lg">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy-200">{greeting()},</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {s.firstName} {s.lastName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-100">
              <span className="font-mono text-gold-400">{s.studentId}</span>
              <span>{s.program?.name}</span>
              {s.cohort && <span>Cohort {s.cohort}</span>}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{t.standing}</span>
            </p>
          </div>
          {me.college && (
            <Image src={collegeLogo(me.college.logoFileId)} alt={me.college.name} width={64} height={64} unoptimized className="hidden h-16 w-16 rounded-2xl bg-white object-contain p-1.5 sm:block" />
          )}
        </div>
        {sem && (
          <div className="relative mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {sem.name} {sem.academicYear}
                {sem.registrationOpen && <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">Registration open</span>}
              </span>
              {daysLeft !== null && <span className="text-navy-200">{daysLeft} days left · ends {fmtDate(sem.endDate)}</span>}
            </div>
            {semPct !== null && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Semester progress" aria-valuenow={semPct} aria-valuemin={0} aria-valuemax={100}>
                <motion.div className="h-full rounded-full bg-gold-500" initial={{ width: 0 }} animate={{ width: `${semPct}%` }} transition={{ duration: 1.1, ease }} />
              </div>
            )}
          </div>
        )}
      </motion.section>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {QUICK.map((q, i) => (
          <motion.div key={q.href} {...rise(i + 1)}>
            <Link href={q.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs font-medium text-navy-900 transition hover:-translate-y-0.5 hover:border-gold-500/50 hover:shadow-md sm:text-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition group-hover:bg-gold-500 group-hover:text-navy-900">
                <Icon name={q.icon} className="h-5 w-5" />
              </span>
              {q.label}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div {...rise(2)}>
          <Link href="/portal/my/grades" className="flex h-full items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
            <GpaRing value={t.cgpa} />
            <div>
              <p className="text-sm text-slate-500">Academic standing</p>
              <p className="text-lg font-semibold text-navy-900">{t.standing}</p>
              <p className="mt-1 text-xs text-slate-500">{t.creditsAttempted} credits graded</p>
            </div>
          </Link>
        </motion.div>
        <motion.div {...rise(3)}>
          <Link href="/portal/my/courses" className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
            <p className="text-sm text-slate-500">Progress to graduation</p>
            <p className="mt-1 text-3xl font-bold text-navy-900">
              {t.creditsEarned}
              <span className="text-base font-medium text-slate-400"> / {totalCredits || "—"} credits</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="h-full rounded-full bg-navy-700" initial={{ width: 0 }} animate={{ width: `${creditPct}%` }} transition={{ duration: 1.1, ease }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{creditPct}% complete</p>
          </Link>
        </motion.div>
        <motion.div {...rise(4)}>
          <div className="grid h-full grid-cols-2 gap-4">
            <Link href="/portal/my/finance" className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md">
              <p className="text-sm text-slate-500">Balance</p>
              <p className={cx("text-lg font-bold", data.balance ? "text-amber-700" : "text-emerald-700")}>{data.balance ? formatMoney(data.balance) : "Paid up"}</p>
            </Link>
            <Link href="/portal/my/timetable" className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md">
              <p className="text-sm text-slate-500">Attendance</p>
              <p className={cx("text-lg font-bold", attAvg === null ? "text-slate-400" : attAvg < 75 ? "text-red-700" : "text-emerald-700")}>{attAvg === null ? "—" : `${attAvg}%`}</p>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Today's classes */}
        <Card title={`Today · ${today}`} actions={<Link href="/portal/my/timetable" className="text-sm text-navy-600 hover:underline">Week</Link>}>
          {classes.length ? (
            <ol className="relative flex flex-col gap-3 border-l-2 border-slate-100 pl-4">
              {classes.map((c: any, i: number) => {
                const live = c.start <= nowHM && nowHM < c.end;
                const done = c.end <= nowHM;
                return (
                  <li key={i} className={cx("relative", done && "opacity-50")}>
                    <span className={cx("absolute top-1.5 -left-[22px] h-3 w-3 rounded-full ring-4 ring-white", live ? "bg-emerald-500" : "bg-gold-500")} />
                    <p className="text-xs font-semibold text-slate-500">
                      {c.start}–{c.end} {live && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Now</span>}
                    </p>
                    <p className="text-sm font-semibold text-navy-900">
                      {c.course?.code} · {c.course?.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.room ? `Room ${c.room}` : "Room TBA"}
                      {c.instructor && ` · ${c.instructor}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">No classes today. Enjoy the break!</p>
          )}
        </Card>

        {/* Current courses */}
        <Card title="This semester" actions={<Link href="/portal/my/courses" className="text-sm text-navy-600 hover:underline">All courses</Link>}>
          {current.length ? (
            <ul className="flex flex-col gap-3">
              {current.slice(0, 5).map((r) => {
                const a = (data.attendance as any[]).find((x) => String(x.section) === String(r.section?._id));
                return (
                  <li key={r._id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy-900">
                        {r.course?.code} <span className="font-normal text-slate-600">{r.course?.title}</span>
                      </p>
                      <p className="text-xs text-slate-500">{r.course?.credits} credits</p>
                    </div>
                    <span className={cx("shrink-0 text-xs font-semibold", a?.percent == null ? "text-slate-400" : a.percent < 75 ? "text-red-700" : "text-emerald-700")}>{a?.percent == null ? "—" : `${a.percent}%`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No approved courses yet.{" "}
              <Link href="/portal/my/registration" className="font-medium text-navy-600 hover:underline">
                Register now
              </Link>
            </p>
          )}
          {pending > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{pending} registration(s) waiting for approval.</p>}
        </Card>

        {/* Announcements */}
        <Card title="Announcements" actions={<Link href="/portal/announcements" className="text-sm text-navy-600 hover:underline">All</Link>}>
          {news.data?.items.length ? (
            <ul className="flex flex-col gap-4">
              {news.data.items.slice(0, 3).map((a) => (
                <li key={a._id}>
                  <p className="text-sm font-semibold text-navy-900">{a.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{a.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No announcements right now.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
