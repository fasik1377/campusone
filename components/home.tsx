"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ClientError, fmtDate, useApi } from "@/lib/client";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { Icon, type IconName } from "./icons";
import { collegeLogo } from "./site";
import { Button, cx, ErrorBox, inputClass, StatusBadge } from "./ui";
import { useSite, type PublicSite } from "./use-site";

/* --------------------------------- Data --------------------------------- */

type Stats = { colleges: number; programs: number; departments: number; courses: number; students: number };
type College = { _id: string; name: string; code: string; slug: string; tagline?: string; address?: string; logoFileId?: string; coverImage?: string; brandColor?: string; programCount: number; admissionsOpen: boolean };

const HomeData = createContext<{ stats: Stats | null; colleges: College[] | null; site: PublicSite | null; content: SiteContent }>({
  stats: null,
  colleges: null,
  site: null,
  content: DEFAULT_SITE_CONTENT,
});

// One gentle motion vocabulary for the whole page: a short fade-and-rise as content enters.
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger = (gap = 0.08): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap } } });
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-60px" } } as const;

export function HomePage() {
  const stats = useApi<Stats>("/public/stats");
  const colleges = useApi<{ items: College[] }>("/public/colleges");
  const site = useSite();
  return (
    <MotionConfig reducedMotion="user">
      <HomeData value={{ stats: stats.data, colleges: colleges.data?.items ?? null, site, content: site?.content ?? DEFAULT_SITE_CONTENT }}>
        <Hero />
        <QuickLinks />
        <ImportantDates />
        <Features />
        <Journey />
        <RoleShowcase />
        <FeaturedCollege />
        <News />
        <CollegesSection />
        <Faq />
        <CallToAction />
      </HomeData>
    </MotionConfig>
  );
}

function SectionHeading({ eyebrow, title, text, light }: { eyebrow: string; title: ReactNode; text?: string; light?: boolean }) {
  return (
    <motion.div variants={stagger()} {...inView} className="mx-auto max-w-2xl text-center">
      <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
        {eyebrow}
      </motion.p>
      <motion.h2 variants={fadeUp} className={cx("mt-3 text-3xl font-bold tracking-tight sm:text-4xl", light ? "text-white" : "text-navy-900")}>
        {title}
      </motion.h2>
      {text && (
        <motion.p variants={fadeUp} className={cx("mt-4 text-lg", light ? "text-navy-100" : "text-slate-600")}>
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  const { stats, content, site } = useContext(HomeData);
  const words = content.rotatingWords.length ? content.rotatingWords : DEFAULT_SITE_CONTENT.rotatingWords;
  const [word, setWord] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % words.length), 3200);
    return () => clearInterval(t);
  }, [words.length]);
  const latest = site?.news[0];

  return (
    <section className="relative isolate overflow-hidden bg-navy-900 pt-28 pb-24 sm:pt-32 lg:pb-28">
      {/* Static backdrop: faint grid and two soft glows */}
      <div className="bg-grid absolute inset-0 -z-10" />
      <div className="absolute -top-40 right-0 -z-10 h-[460px] w-[460px] rounded-full bg-gold-500/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 -z-10 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div variants={stagger(0.1)} initial="hidden" animate="show">
          {latest ? (
            <motion.div variants={fadeUp}>
              <Link
                href={latest.college ? `/colleges/${latest.college.slug}` : "#news"}
                className="group inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pr-3 pl-1 text-sm text-navy-100 transition hover:border-gold-500/50 hover:bg-white/10"
              >
                <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold text-navy-900">New</span>
                <span className="truncate">{latest.title}</span>
                <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-gold-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ) : (
            content.heroEyebrow && (
              <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
                {content.heroEyebrow}
              </motion.p>
            )
          )}

          <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
            {content.heroTitle[0]}
            <br />
            {content.heroTitle[1]}
            <br />
            <span className="text-gold-static">{content.heroTitle[2]}</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-navy-100">
            {content.heroSubtitle}{" "}
            <span className="relative inline-grid align-bottom font-semibold text-gold-400">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={words[word % words.length]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  {words[word % words.length]}.
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
            <Link href="/colleges" className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3.5 font-semibold text-navy-900 shadow-lg shadow-gold-500/20 transition hover:bg-gold-400">
              Explore colleges <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/admissions" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
              How admission works
            </Link>
          </motion.div>

          {stats && (
            <motion.dl variants={fadeUp} className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 py-4 text-center">
              {[
                [stats.programs, "Programs"],
                [stats.courses, "Courses"],
                [stats.departments, "Departments"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dd className="text-2xl font-bold text-white">{v}</dd>
                  <dt className="text-xs text-navy-200">{l}</dt>
                </div>
              ))}
            </motion.dl>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease }}>
          <StartPanel />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------ Start panel ------------------------------ */

const TABS = [
  { key: "apply", label: "Apply", icon: "admissions" },
  { key: "track", label: "Track application", icon: "registration" },
  { key: "signin", label: "Sign in", icon: "shield" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** The hero's working panel: start an application, check its status, or reach your college's sign-in. */
function StartPanel() {
  const { colleges } = useContext(HomeData);
  const [tab, setTab] = useState<TabKey>("apply");
  const list = colleges ?? [];
  const [slug, setSlug] = useState("");
  const college = list.find((c) => c.slug === slug) ?? list[0];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30">
      {college && (
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
          <Image src={collegeLogo(college.logoFileId)} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-xl border border-slate-100 object-contain p-1" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Start here</p>
            {list.length > 1 ? (
              <select aria-label="College" value={college.slug} onChange={(e) => setSlug(e.target.value)} className="mt-0.5 w-full truncate bg-transparent text-lg font-bold text-navy-900 focus:outline-none">
                {list.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-lg font-bold text-navy-900">{college.name}</p>
            )}
            {college.admissionsOpen && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Admissions open · {college.programCount} programs
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50 p-1.5" role="tablist" aria-label="What would you like to do?">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx("flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-colors sm:flex-row sm:justify-center sm:text-sm", tab === t.key ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900")}
          >
            <Icon name={t.icon as IconName} className={cx("h-4 w-4", tab === t.key ? "text-gold-600" : "")} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[280px] p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab + (college?.slug ?? "")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === "apply" && <ApplyTab college={college} />}
            {tab === "track" && <TrackTab />}
            {tab === "signin" && <SignInTab college={college} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ApplyTab({ college }: { college?: College }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = useApi<{ programs: any[]; admissionsEnabled: boolean }>(college ? `/public/colleges/${college.slug}` : null);
  const open = (data?.programs ?? []).filter((p) => p.admissionOpen);
  const [program, setProgram] = useState("");
  const chosen = open.find((p) => p._id === program);

  if (!college) return <p className="text-sm text-slate-500">No colleges are accepting applications yet.</p>;
  if (data && (!data.admissionsEnabled || !open.length)) return <p className="text-sm text-slate-500">Admissions at {college.name} are currently closed. Check back soon.</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">Choose a program to see its requirements, then complete the online form. It takes about 10 minutes.</p>
      <label className="flex flex-col gap-1 text-sm font-medium text-navy-900">
        Program
        <select className={inputClass} value={program} onChange={(e) => setProgram(e.target.value)} disabled={!data}>
          <option value="">{data ? "Select a program…" : "Loading programs…"}</option>
          {open.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} · {p.level}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-navy-900">
            {chosen.durationYears} years · {chosen.totalCredits} credits · {chosen.department?.name}
          </p>
          {chosen.admissionRequirements && <p className="mt-1">{chosen.admissionRequirements}</p>}
        </div>
      )}
      <Link
        href={program ? `/apply?college=${college.slug}&program=${program}` : `/apply?college=${college.slug}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 font-semibold text-white transition hover:bg-navy-800"
      >
        {program ? "Continue to application" : "Start an application"} <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </div>
  );
}

type Status = { applicationNumber: string; firstName: string; status: string; program: string; college: string; submittedAt: string; message?: string };

function TrackTab() {
  const [number, setNumber] = useState("");
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
      setError((err as ClientError).status === 404 ? "We couldn't find an application with that number and email. Check both and try again." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-sm font-semibold text-navy-900">{result.applicationNumber}</p>
          <StatusBadge status={result.status} />
        </div>
        <p className="text-sm text-slate-600">
          {result.firstName}, your application for <b className="text-navy-900">{result.program}</b> at {result.college} was submitted on {fmtDate(result.submittedAt)}.
        </p>
        {result.message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-navy-900">“{result.message}”</p>}
        <button onClick={() => setResult(null)} className="self-start text-sm font-medium text-navy-600 hover:underline">
          Check another application
        </button>
      </div>
    );

  return (
    <form onSubmit={check} className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">Enter the number you received after applying and the email you used.</p>
      <input aria-label="Application number" required placeholder="APP-ABC-2026-00001" className={inputClass} value={number} onChange={(e) => setNumber(e.target.value)} />
      <input aria-label="Email" type="email" required placeholder="you@example.com" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="py-3">
        Check status
      </Button>
    </form>
  );
}

function SignInTab({ college }: { college?: College }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Students and staff sign in with the username and password from their college administrator. You&apos;ll land on the dashboard for your role.
      </p>
      {college && (
        <Link href={`/colleges/${college.slug}#signin`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 font-semibold text-white transition hover:bg-navy-800">
          Sign in to {college.name} <Icon name="arrow" className="h-4 w-4" />
        </Link>
      )}
      <ul className="flex flex-col gap-2 text-sm text-slate-600">
        {["Register for courses and see your timetable", "Grades, GPA and transcripts", "Fees, receipts and service requests"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-emerald-600" /> {t}
          </li>
        ))}
      </ul>
      <Link href="/login" className="text-center text-xs text-slate-500 hover:text-navy-900">
        Platform administrator? Sign in here
      </Link>
    </div>
  );
}

/* ------------------------------ Quick links ----------------------------- */

/** Portal-style shortcut row that overlaps the bottom of the hero. */
function QuickLinks() {
  const { colleges } = useContext(HomeData);
  const first = colleges?.[0];
  const links: { href: string; title: string; text: string; icon: IconName }[] = [
    { href: first ? `/colleges/${first.slug}#signin` : "/login", title: "Student portal", text: "Courses, grades, timetable and fees", icon: "grades" },
    { href: first ? `/colleges/${first.slug}#signin` : "/login", title: "Staff & faculty", text: "Teaching, registry and administration", icon: "shield" },
    { href: "/admissions", title: "Admissions", text: "Apply online and track your status", icon: "admissions" },
    { href: "#calendar", title: "Academic calendar", text: "Semesters and registration dates", icon: "calendar" },
  ];
  return (
    <section className="relative z-10 -mt-10 px-4 sm:px-6">
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mx-auto grid max-w-7xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((l) => (
          <motion.div key={l.title} variants={fadeUp}>
            <Link href={l.href} className="group flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-navy-900/5 transition hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-xl">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition-colors group-hover:bg-gold-500 group-hover:text-navy-900">
                <Icon name={l.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy-900">{l.title}</span>
                <span className="block text-sm text-slate-500">{l.text}</span>
              </span>
              <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-gold-600" />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ---------------------------- Important dates ---------------------------- */

type CalendarItem = { _id: string; name: string; academicYear: string; startDate?: string; endDate?: string; registrationOpen: boolean; isCurrent: boolean; college: { name: string; slug: string } | null };

function ImportantDates() {
  const { data } = useApi<{ items: CalendarItem[] }>("/public/calendar");
  const items = data?.items ?? [];
  if (!items.length) return null;
  const day = 864e5;
  return (
    <section id="calendar" className="scroll-mt-20 bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Academic calendar" title="Important dates" text="Current and upcoming semesters, and when registration is open." />
        <motion.ol variants={stagger(0.08)} {...inView} className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((s) => {
            const start = s.startDate ? +new Date(s.startDate) : null;
            const end = s.endDate ? +new Date(s.endDate) : null;
            const pct = start && end ? Math.round(Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) * 100) : null;
            const startsIn = start && start > Date.now() ? Math.ceil((start - Date.now()) / day) : null;
            const daysLeft = end && end > Date.now() ? Math.ceil((end - Date.now()) / day) : null;
            return (
              <motion.li key={s._id} variants={fadeUp} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 py-2 text-white">
                  <span className="text-[11px] uppercase tracking-wider text-gold-400">{s.startDate ? new Date(s.startDate).toLocaleDateString("en-GB", { month: "short" }) : "—"}</span>
                  <span className="text-2xl font-bold leading-none">{s.startDate ? new Date(s.startDate).getDate() : "—"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy-900">
                      {s.name} {s.academicYear}
                    </h3>
                    {s.isCurrent && <span className="rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-700">Current</span>}
                    {s.registrationOpen && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Registration open
                      </span>
                    )}
                  </div>
                  {s.college && (
                    <Link href={`/colleges/${s.college.slug}`} className="text-sm text-slate-500 hover:text-navy-900">
                      {s.college.name}
                    </Link>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    {s.startDate ? fmtDate(s.startDate) : "TBA"} – {s.endDate ? fmtDate(s.endDate) : "TBA"}
                  </p>
                  {pct !== null && s.isCurrent && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="h-full rounded-full bg-gold-500" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, ease }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{daysLeft !== null ? `${pct}% through · ${daysLeft} days left` : "Completed"}</p>
                    </div>
                  )}
                  {startsIn !== null && <p className="mt-2 text-xs font-medium text-navy-600">Starts in {startsIn} days</p>}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}

/* ------------------------------- Features ------------------------------- */

const FEATURES: { title: string; text: string; icon: IconName }[] = [
  { title: "Admissions without paperwork", text: "Online applications with document upload and status tracking. Accepted applicants become students without re-typing anything.", icon: "admissions" },
  { title: "Smart registration", text: "Prerequisites, capacity, credit limits, timetable clashes and fee clearance are checked automatically.", icon: "registration" },
  { title: "Grades you can trust", text: "Instructor entry → department approval → registrar publication. Every correction keeps its history.", icon: "grades" },
  { title: "Timetables & attendance", text: "Conflict-checked schedules and per-session attendance with early warnings.", icon: "calendar" },
  { title: "Fees & receipts", text: "Invoices, verified payments and receipts with clear balances for every student.", icon: "finance" },
  { title: "Excel in, Excel out", text: "Import whole cohorts, download class lists, and upload grade sheets — validated row by row.", icon: "excel" },
];

function Features() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Everything in one place" title="Built for how colleges really work" text="From the first application to graduation — one consistent, auditable record." />
        <motion.div variants={stagger(0.06)} {...inView} className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.article key={f.title} variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                <Icon name={f.icon} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-slate-600">{f.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------- Journey -------------------------------- */

const STEPS: { title: string; text: string; icon: IconName }[] = [
  { title: "Apply", text: "Choose a program and upload documents online.", icon: "admissions" },
  { title: "Get admitted", text: "Receive your student ID and portal login.", icon: "check" },
  { title: "Register", text: "Pick eligible courses; rules are checked instantly.", icon: "registration" },
  { title: "Learn", text: "Attendance, marks and approvals tracked every step.", icon: "grades" },
  { title: "Graduate", text: "Credits, GPA and clearance verified for the award.", icon: "spark" },
];

function Journey() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-24">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading light eyebrow="The student journey" title="From application to graduation" text="One connected record follows each student through every stage." />
        <motion.ol variants={stagger(0.08)} {...inView} className="relative mt-16 grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-6">
          <div className="absolute top-7 right-[10%] left-[10%] hidden h-px bg-linear-to-r from-gold-500/0 via-gold-500/60 to-gold-500/0 lg:block" aria-hidden />
          {STEPS.map((s, i) => (
            <motion.li key={s.title} variants={fadeUp} className="relative flex gap-5 lg:flex-col lg:items-center lg:text-center">
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/40 bg-navy-800 text-gold-400">
                <Icon name={s.icon} />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-900">{i + 1}</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-navy-200">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

/* ---------------------------- Role showcase ----------------------------- */

const ROLES = [
  { key: "registrar", label: "Registrar", points: ["Review and admit applicants", "Approve course registrations", "Publish approved grades", "Bulk-import students from Excel"] },
  { key: "instructor", label: "Instructor", points: ["See today's classes", "Take attendance in seconds", "Enter marks or upload a grade sheet", "Submit for department approval"] },
  { key: "student", label: "Student", points: ["Register for eligible courses", "Personal timetable and attendance", "Grades, GPA and graduation progress", "Request transcripts online"] },
  { key: "finance", label: "Finance", points: ["Bill one student or a whole program", "Record verified payments", "Automatic receipts and balances", "Export finance reports"] },
] as const;

type RoleKey = (typeof ROLES)[number]["key"];

function RoleShowcase() {
  const [active, setActive] = useState<RoleKey>("registrar");
  const role = ROLES.find((r) => r.key === active)!;

  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="One portal, every role" title="Everyone sees exactly what they need" text="Each person lands on a dashboard made for their role." />
        <div className="mt-12 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist">
            {ROLES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={active === r.key}
                onClick={() => setActive(r.key)}
                className={cx("rounded-xl px-4 py-2 text-sm font-medium transition-colors", active === r.key ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={role.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <ul className="flex flex-col gap-3">
              {role.points.map((p) => (
                <li key={p} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-navy-900">{p}</span>
                </li>
              ))}
            </ul>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                <span className="ml-3 text-xs text-slate-400">campusone / portal / {role.label.toLowerCase()}</span>
              </div>
              <div className="h-[300px] p-5">
                <RoleMock role={role.key} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Illustrative previews of each role's dashboard (sample data). */
function RoleMock({ role }: { role: RoleKey }) {
  if (role === "registrar")
    return (
      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-semibold text-navy-900">Applications requiring review</p>
        {[
          ["APP-ABC-2026-00014", "BSc in Nursing", "Under review", "bg-amber-50 text-amber-700"],
          ["APP-ABC-2026-00015", "BA in Management", "Accepted", "bg-emerald-50 text-emerald-700"],
          ["APP-ABC-2026-00016", "BSc in Computer Science", "Submitted", "bg-amber-50 text-amber-700"],
          ["APP-ABC-2026-00017", "BA in Accounting and Finance", "Info required", "bg-sky-50 text-sky-700"],
        ].map(([no, prog, st, cls]) => (
          <div key={no} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
            <div>
              <p className="font-mono text-xs text-navy-900">{no}</p>
              <p className="text-xs text-slate-500">{prog}</p>
            </div>
            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{st}</span>
          </div>
        ))}
      </div>
    );
  if (role === "instructor")
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-navy-900">CS111 · Mark sheet</p>
        <div className="overflow-hidden rounded-lg border border-slate-100 text-xs">
          <div className="grid grid-cols-5 bg-slate-50 px-3 py-2 font-semibold text-slate-500">
            <span className="col-span-2">Student</span>
            <span>CA /30</span>
            <span>Final /50</span>
            <span>Grade</span>
          </div>
          {[
            ["ABC-0001", 27, 44, "A"],
            ["ABC-0002", 22, 38, "B+"],
            ["ABC-0003", 25, 41, "A-"],
            ["ABC-0004", 18, 30, "B-"],
          ].map(([id, ca, fin, g]) => (
            <div key={id} className="grid grid-cols-5 border-t border-slate-100 px-3 py-2.5">
              <span className="col-span-2 font-mono text-navy-900">{id}</span>
              <span>{ca}</span>
              <span>{fin}</span>
              <span className="font-bold text-navy-900">{g}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 inline-flex rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-navy-900">Submit for approval</div>
      </div>
    );
  if (role === "student")
    return (
      <div className="flex h-full items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#d6a84f" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray="0.905 1" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-navy-900">3.62</span>
            <span className="text-xs text-slate-500">CGPA</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm font-semibold text-navy-900">Today</p>
          {[
            ["08:00", "Fundamentals of Nursing", "Skills Lab"],
            ["10:30", "Human Anatomy", "R102"],
            ["14:00", "Communication Skills", "R101"],
          ].map(([t, c, r]) => (
            <div key={t} className="rounded-lg border-l-4 border-gold-500 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-navy-900">
                {t} · {c}
              </p>
              <p className="text-xs text-slate-500">{r}</p>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-navy-900">Collections by month</p>
      <div className="mt-4 flex flex-1 items-end gap-3">
        {[45, 62, 38, 80, 71, 92].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full max-w-6 rounded-t-[4px] bg-navy-700" style={{ height: `${h * 2}px` }} />
            <span className="text-xs text-slate-400">{["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Featured college --------------------------- */

function FeaturedCollege() {
  // Chosen on the Website content page; the API falls back to a college with a cover image.
  const { site } = useContext(HomeData);
  const college = site?.featured;
  if (!college) return null;
  const accent = college.brandColor ?? "#d6a84f";

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Featured college" title={college.name} text={college.tagline} />
        <motion.div
          variants={fadeUp}
          {...inView}
          className="mt-12 grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.4fr_1fr]"
          style={{ borderTop: `4px solid ${accent}` }}
        >
          {college.coverImage && (
            <div className="relative aspect-[2/1] lg:aspect-auto lg:min-h-[340px]">
              <Image src={college.coverImage} alt={`${college.name} banner`} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 60vw, 100vw" />
            </div>
          )}
          <div className="flex flex-col justify-center gap-5 p-8 lg:p-10">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
                <Image src={collegeLogo(college.logoFileId)} alt={`${college.name} logo`} width={72} height={72} unoptimized className="h-16 w-16 object-contain" />
              </div>
              <div>
                <p className="font-mono text-sm text-slate-500">{college.code}</p>
                <p className="text-xl font-bold text-navy-900">{college.name}</p>
                {college.address && <p className="text-sm text-slate-500">📍 {college.address}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-navy-900">{college.programCount} programs</span>
              {college.admissionsOpen && <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">Admissions open</span>}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/colleges/${college.slug}`} className="rounded-xl px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-110" style={{ backgroundColor: accent }}>
                Visit college
              </Link>
              {college.admissionsOpen && (
                <Link href={`/apply?college=${college.slug}`} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-navy-900 transition hover:bg-slate-50">
                  Apply now
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------- News --------------------------------- */

function News() {
  const { site } = useContext(HomeData);
  if (!site?.news.length) return null;
  return (
    <section id="news" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="News & announcements" title="What's happening" />
        <motion.div
          variants={stagger(0.06)}
          {...inView}
          className={cx("mt-12 grid grid-cols-1 gap-5", site.news.length === 1 ? "mx-auto max-w-md" : site.news.length === 2 ? "mx-auto max-w-3xl md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}
        >
          {site.news.map((n) => (
            <motion.article key={n._id} variants={fadeUp} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-lg">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="rounded-full bg-gold-50 px-2.5 py-1 font-medium text-gold-700">{n.college?.name ?? "CampusOne"}</span>
                <time className="text-slate-400">{fmtDate(n.createdAt)}</time>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">{n.title}</h3>
              <p className="mt-2 line-clamp-4 flex-1 text-sm text-slate-600">{n.body}</p>
              {n.college && (
                <Link href={`/colleges/${n.college.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:text-navy-900">
                  Visit college <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              )}
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------- Colleges ------------------------------- */

function CollegesSection() {
  const { colleges } = useContext(HomeData);
  // With a single college, the featured section already covers it.
  if (!colleges || colleges.length < 2) return null;
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Directory" title="Find your college" />
        <motion.div variants={stagger(0.06)} {...inView} className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.slice(0, 6).map((c) => (
            <motion.div key={c._id} variants={fadeUp}>
              <Link href={`/colleges/${c.slug}`} className="group flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-lg">
                <Image src={collegeLogo(c.logoFileId)} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-xl border border-slate-100 object-contain p-1" />
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.programCount} programs</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------- FAQ ---------------------------------- */

function Faq() {
  const { content } = useContext(HomeData);
  const [open, setOpen] = useState<number | null>(0);
  if (!content.faqs.length) return null;
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="Questions" title="Frequently asked" />
        <div className="mt-10 flex flex-col gap-3">
          {content.faqs.map((f, i) => (
            <div key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-navy-900" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {f.q}
                <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700 transition-transform", open === i && "rotate-45")}>
                  <Icon name="plus" className="h-4 w-4" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }}>
                    <p className="px-5 pb-5 text-slate-600">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- CTA ---------------------------------- */

function CallToAction() {
  const { content } = useContext(HomeData);
  const words = content.ctaTitle.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <section className="px-4 pb-24 sm:px-6">
      <motion.div variants={fadeUp} {...inView} className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy-900 px-6 py-16 text-center shadow-xl sm:px-16">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {words.join(" ")} <span className="text-gold-static">{last}</span>
          </h2>
          {content.ctaText && <p className="mx-auto mt-4 max-w-xl text-lg text-navy-100">{content.ctaText}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3.5 font-semibold text-navy-900 transition hover:bg-gold-400">
              Start your application <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
              Sign in to the portal
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
