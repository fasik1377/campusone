"use client";

import Image from "next/image";
import Link from "next/link";
import {
  animate,
  AnimatePresence,
  motion,
  MotionConfig,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApi } from "@/lib/client";
import { Icon, type IconName } from "./icons";
import { collegeLogo } from "./site";
import { CollegeCarousel3D, Cube, PerspectiveFloor, TiltCard } from "./three-d";
import { cx } from "./ui";
import { useSite, type PublicSite } from "./use-site";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { fmtDate } from "@/lib/client";

/* --------------------------------- Data --------------------------------- */

type Stats = { colleges: number; programs: number; departments: number; courses: number; students: number };
type College = { _id: string; name: string; code: string; slug: string; tagline?: string; address?: string; logoFileId?: string; coverImage?: string; brandColor?: string; programCount: number; admissionsOpen: boolean };

const HomeData = createContext<{ stats: Stats | null; colleges: College[] | null; site: PublicSite | null; content: SiteContent }>({
  stats: null,
  colleges: null,
  site: null,
  content: DEFAULT_SITE_CONTENT,
});

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } };
const stagger = (gap = 0.1, delay = 0): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } });

export function HomePage() {
  const stats = useApi<Stats>("/public/stats");
  const colleges = useApi<{ items: College[] }>("/public/colleges");
  const site = useSite();
  return (
    <MotionConfig reducedMotion="user">
      <HomeData value={{ stats: stats.data, colleges: colleges.data?.items ?? null, site, content: site?.content ?? DEFAULT_SITE_CONTENT }}>
        <ScrollProgress />
        <Hero />
        <CollegeMarquee />
        <StatsBand />
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

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div style={{ scaleX }} className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-linear-to-r from-gold-600 via-gold-400 to-gold-500" />;
}

function SectionHeading({ eyebrow, title, text, light }: { eyebrow: string; title: ReactNode; text?: string; light?: boolean }) {
  return (
    <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mx-auto max-w-2xl text-center">
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
  const { stats, content } = useContext(HomeData);
  const ROTATING = content.rotatingWords.length ? content.rotatingWords : DEFAULT_SITE_CONTENT.rotatingWords;
  const [word, setWord] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % ROTATING.length), 2400);
    return () => clearInterval(t);
  }, [ROTATING.length]);
  const currentWord = ROTATING[word % ROTATING.length];

  // Mouse parallax for the visual on the right.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });

  const cubeNearX = useSpring(useTransform(mx, [-0.5, 0.5], [-50, 50]), { stiffness: 60, damping: 20 });
  const cubeNearY = useSpring(useTransform(my, [-0.5, 0.5], [-40, 40]), { stiffness: 60, damping: 20 });
  const cubeFarX = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 60, damping: 20 });
  const cubeFarY = useSpring(useTransform(my, [-0.5, 0.5], [-14, 14]), { stiffness: 60, damping: 20 });

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  return (
    <section
      className="relative isolate overflow-hidden bg-navy-900 pt-28 pb-20 sm:pt-32 lg:pb-28"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      {/* Background: drifting glows over a faint grid */}
      <div className="bg-grid absolute inset-0 -z-10" />
      <motion.div
        className="absolute -top-40 -right-32 -z-10 h-[520px] w-[520px] rounded-full bg-gold-500/25 blur-3xl"
        animate={{ x: [0, -60, 20, 0], y: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -left-40 -z-10 h-[560px] w-[560px] rounded-full bg-sky-500/20 blur-3xl"
        animate={{ x: [0, 80, -30, 0], y: [0, -50, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <PerspectiveFloor className="-z-10" />

      {/* Floating 3D cubes at different depths: nearer ones drift further with the mouse */}
      <motion.div style={{ x: cubeNearX, y: cubeNearY }} className="absolute top-[18%] left-[46%] -z-10 hidden lg:block">
        <Cube size={56} duration={18} gold />
      </motion.div>
      <motion.div style={{ x: cubeFarX, y: cubeFarY }} className="absolute top-[12%] left-[6%] -z-10 opacity-60">
        <Cube size={38} duration={26} />
      </motion.div>
      <motion.div style={{ x: cubeFarX, y: cubeNearY }} className="absolute right-[4%] bottom-[14%] -z-10 hidden opacity-70 sm:block">
        <Cube size={44} duration={22} />
      </motion.div>

      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div variants={stagger(0.12, 0.1)} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-navy-100 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {content.heroEyebrow || (stats ? `Live · ${stats.colleges} colleges · ${stats.programs} programs` : "College Management Platform")}
          </motion.div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            {content.heroTitle.slice(0, 2).map((line, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <motion.span className="block" variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.8, ease } } }}>
                  {line}
                </motion.span>
              </span>
            ))}
            <span className="block overflow-hidden pb-2">
              <motion.span className="text-gold-gradient block" variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.8, ease } } }}>
                {content.heroTitle[2]}
              </motion.span>
            </span>
          </h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-navy-100">
            {content.heroSubtitle}{" "}
            <span className="relative inline-flex h-[1.6em] min-w-[11ch] overflow-hidden align-bottom font-semibold text-gold-400">
              <AnimatePresence mode="wait">
                <motion.span key={currentWord} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.35, ease }} className="absolute left-0 whitespace-nowrap">
                  {currentWord}.
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
            <MagneticLink href="/colleges" primary>
              Find a college <Icon name="arrow" className="h-4 w-4" />
            </MagneticLink>
            <MagneticLink href="/apply">Apply online</MagneticLink>
          </motion.div>

          <motion.ul variants={fadeUp} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200">
            {["Role-based portals", "Excel import & export", "Tenant-isolated data"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4 text-gold-500" /> {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }} className="relative mx-auto aspect-square w-full max-w-[460px]">
          <HeroVisual />
        </motion.div>
      </motion.div>
    </section>
  );
}

function MagneticLink({ href, primary, children }: { href: string; primary?: boolean; children: ReactNode }) {
  const x = useSpring(0, { stiffness: 250, damping: 15 });
  const y = useSpring(0, { stiffness: 250, damping: 15 });
  return (
    <motion.div
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25);
        y.set((e.clientY - r.top - r.height / 2) * 0.35);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.96 }}
    >
      <Link
        href={href}
        className={cx(
          "relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 font-semibold transition-colors",
          primary ? "bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/25 hover:bg-gold-400" : "border border-white/25 text-white hover:bg-white/10",
        )}
      >
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {primary && <span className="absolute inset-y-0 left-0 w-1/3 animate-shine bg-white/40" aria-hidden />}
      </Link>
    </motion.div>
  );
}

const ORBIT = [
  { label: "Registrar", icon: "registration" },
  { label: "Instructor", icon: "grades" },
  { label: "Student", icon: "admissions" },
  { label: "Finance", icon: "finance" },
  { label: "Dean", icon: "chart" },
  { label: "Admin", icon: "shield" },
] as const;

function HeroVisual() {
  const { stats, site } = useContext(HomeData);
  const latest = site?.news[0];
  return (
    <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
      {/* Orbit rings */}
      <div className="absolute inset-[6%] rounded-full border border-white/10" />
      <div className="absolute inset-[22%] rounded-full border border-dashed border-gold-500/25" />

      {/* Role chips travelling around the outer ring; each counter-rotates to stay upright */}
      <motion.div className="absolute inset-[6%]" animate={{ rotate: 360 }} transition={{ duration: 48, repeat: Infinity, ease: "linear" }}>
        {ORBIT.map((o, i) => {
          const angle = (i / ORBIT.length) * Math.PI * 2;
          return (
            <div key={o.label} className="absolute" style={{ left: `${50 + 50 * Math.cos(angle)}%`, top: `${50 + 50 * Math.sin(angle)}%`, transform: "translate(-50%, -50%)" }}>
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 48, repeat: Infinity, ease: "linear" }}>
                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-navy-800/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
                  <Icon name={o.icon} className="h-3.5 w-3.5 text-gold-400" />
                  {o.label}
                </div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Glass panels stacked behind the logo give the card visible depth when the scene tilts */}
      <div className="absolute inset-[27%] rounded-[2.2rem] border border-white/10 bg-white/5 backdrop-blur-sm" style={{ transform: "translateZ(-40px) rotate(-8deg)" }} />
      <div className="absolute inset-[25%] rounded-[2.4rem] border border-gold-500/20 bg-gold-500/5" style={{ transform: "translateZ(-90px) rotate(10deg)" }} />

      {/* Centre logo card */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -14, 0] }}
        transition={{ scale: { duration: 0.9, ease }, opacity: { duration: 0.9 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
        className="absolute inset-[30%] flex items-center justify-center rounded-[2rem] bg-white shadow-2xl shadow-black/40"
        style={{ transform: "translateZ(60px)" }}
      >
        <Image src="/logo.png" alt="CampusOne" width={240} height={240} priority className="h-[82%] w-[82%] object-contain" />
        <div className="absolute -inset-3 -z-10 rounded-[2.4rem] bg-gold-500/30 blur-2xl" />
      </motion.div>

      {/* Floating cards with live figures from the database */}
      {stats && (
        <>
          <FloatCard className="left-[-4%] top-[10%]" delay={0.6} float={5}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <Icon name="building" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Colleges live</p>
              <p className="text-sm font-semibold text-navy-900">{stats.colleges} on CampusOne</p>
            </div>
          </FloatCard>
          <FloatCard className="right-[-6%] top-[38%]" delay={0.9} float={6.5}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
              <Icon name="grades" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Programs offered</p>
              <p className="text-sm font-semibold text-navy-900">
                {stats.programs} programs · {stats.courses} courses
              </p>
            </div>
          </FloatCard>
        </>
      )}
      {latest ? (
        <FloatCard className="bottom-[4%] left-[2%] max-w-[240px]" delay={1.2} float={5.8}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
            <Icon name="spark" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Latest news</p>
            <p className="truncate text-sm font-semibold text-navy-900">{latest.title}</p>
          </div>
        </FloatCard>
      ) : (
        stats && (
          <FloatCard className="bottom-[4%] left-[6%]" delay={1.2} float={5.8}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <Icon name="admissions" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active students</p>
              <p className="text-sm font-semibold text-navy-900">{stats.students.toLocaleString()}</p>
            </div>
          </FloatCard>
        )
      )}
    </div>
  );
}

function FloatCard({ className, delay, float, children }: { className: string; delay: number; float: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
      transition={{ opacity: { delay }, scale: { delay, type: "spring", stiffness: 200, damping: 14 }, y: { delay: delay + 0.6, duration: float, repeat: Infinity, ease: "easeInOut" } }}
      className={cx("absolute z-10 flex items-center gap-3 rounded-xl border border-white/60 bg-white/95 px-3 py-2.5 shadow-xl shadow-black/20 backdrop-blur", className)}
      style={{ transform: "translateZ(90px)" }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------- Marquee -------------------------------- */

function CollegeMarquee() {
  const { colleges } = useContext(HomeData);
  if (!colleges?.length) return null;
  // Repeat the list so the strip is always wider than the viewport, then double it for a seamless loop.
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / colleges.length)) }, () => colleges).flat();
  const items = [...base, ...base];
  return (
    <section className="border-b border-slate-200 bg-white py-8" aria-label="Colleges on CampusOne">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Colleges running on CampusOne</p>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-12 pr-12 group-hover:[animation-play-state:paused]">
          {items.map((c, i) => (
            <Link key={`${c._id}-${i}`} href={`/colleges/${c.slug}`} className="flex shrink-0 items-center gap-3 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" tabIndex={i < base.length ? 0 : -1} aria-hidden={i >= base.length}>
              <Image src={collegeLogo(c.logoFileId)} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-lg object-contain" />
              <span className="whitespace-nowrap font-semibold text-navy-900">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Stats --------------------------------- */

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, { duration: 1.8, ease, onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString()) });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>0</span>;
}

function StatsBand() {
  const { stats } = useContext(HomeData);
  const items: { label: string; value?: number; icon: IconName }[] = [
    { label: "Colleges", value: stats?.colleges, icon: "building" },
    { label: "Academic programs", value: stats?.programs, icon: "grades" },
    { label: "Courses offered", value: stats?.courses, icon: "registration" },
    { label: "Active students", value: stats?.students, icon: "admissions" },
  ];
  return (
    <section className="bg-slate-50 py-16">
      <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4">
        {items.map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <TiltCard max={14}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" style={{ transformStyle: "preserve-3d" }}>
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400 shadow-lg" style={{ transform: "translateZ(40px)" }}>
                  <Icon name={s.icon} className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold text-navy-900 sm:text-4xl" style={{ transform: "translateZ(25px)" }}>
                  {s.value === undefined ? "—" : <Counter value={s.value} />}
                </p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ------------------------------- Features ------------------------------- */

const FEATURES: { title: string; text: string; icon: IconName; wide?: boolean }[] = [
  { title: "Admissions without paperwork", text: "Online applications with document upload, screening, status tracking, and one-click conversion of accepted applicants into student records.", icon: "admissions", wide: true },
  { title: "Smart registration", text: "Prerequisites, capacity, credit limits, timetable clashes and fee clearance are checked automatically.", icon: "registration" },
  { title: "Grades you can trust", text: "Instructor entry → department approval → registrar publication. Every correction keeps its history.", icon: "grades" },
  { title: "Timetables & attendance", text: "Conflict-checked schedules and per-session attendance with automatic percentage warnings.", icon: "calendar" },
  { title: "Fees & receipts", text: "Invoices, verified payments and receipts in exact currency amounts, with live balances.", icon: "finance" },
  { title: "Excel in, Excel out", text: "Registrars import whole cohorts; instructors download class lists and upload grade sheets — validated row by row.", icon: "excel", wide: true },
];

function Features() {
  return (
    <section className="relative bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Everything in one place" title="Built for how colleges really work" text="From the first application to the graduation list — one consistent, auditable record." />
        <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className={cx(f.wide && "lg:col-span-2")}>
              <TiltCard max={f.wide ? 6 : 10}>
                <article
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                  }}
                  className="group relative h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-2xl"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="spotlight pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative" style={{ transformStyle: "preserve-3d" }}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-400 shadow-xl shadow-navy-900/30 transition-transform duration-300 group-hover:-rotate-6" style={{ transform: "translateZ(50px)" }}>
                      <Icon name={f.icon} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-navy-900" style={{ transform: "translateZ(30px)" }}>
                      {f.title}
                    </h3>
                    <p className="mt-2 text-slate-600" style={{ transform: "translateZ(15px)" }}>
                      {f.text}
                    </p>
                  </div>
                </article>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------- Journey -------------------------------- */

const STEPS: { title: string; text: string; icon: IconName }[] = [
  { title: "Apply", text: "Choose a college and program, upload documents online.", icon: "admissions" },
  { title: "Get admitted", text: "Staff review; accepted applicants get a student ID and login.", icon: "check" },
  { title: "Register", text: "Pick eligible courses; rules are checked instantly.", icon: "registration" },
  { title: "Learn & get graded", text: "Attendance, marks and approvals tracked every step.", icon: "grades" },
  { title: "Graduate", text: "Credits, GPA and clearance verified for the award.", icon: "spark" },
];

function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });

  return (
    <section className="relative overflow-hidden bg-navy-900 py-24">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading light eyebrow="The student journey" title="From application to graduation" text="One connected record follows each student through every stage." />
        <div ref={ref} className="relative mt-16">
          {/* Progress track that fills as you scroll */}
          <div className="absolute top-7 right-[10%] left-[10%] hidden h-0.5 bg-white/10 lg:block" />
          <motion.div style={{ scaleX: progress }} className="absolute top-7 right-[10%] left-[10%] hidden h-0.5 origin-left bg-linear-to-r from-gold-500 to-gold-400 lg:block" />
          <div className="absolute top-0 bottom-0 left-7 w-0.5 bg-white/10 lg:hidden" />
          <motion.div style={{ scaleY: progress }} className="absolute top-0 bottom-0 left-7 w-0.5 origin-top bg-gold-500 lg:hidden" />

          <motion.ol variants={stagger(0.15)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="relative grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-6">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="flex gap-5 lg:flex-col lg:items-center lg:text-center">
                <motion.div
                  whileHover={{ scale: 1.12 }}
                  className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/40 bg-navy-800 text-gold-400 shadow-lg shadow-black/30"
                >
                  <Icon name={s.icon} />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-900">{i + 1}</span>
                </motion.div>
                <div>
                  <h3 className="font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-navy-200">{s.text}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
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
  { key: "admin", label: "Super Admin", points: ["Create and activate colleges", "Assign college administrators", "Enable modules per college", "Platform-wide audit log"] },
] as const;

type RoleKey = (typeof ROLES)[number]["key"];

function RoleShowcase() {
  const [active, setActive] = useState<RoleKey>("registrar");
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((a) => ROLES[(ROLES.findIndex((r) => r.key === a) + 1) % ROLES.length].key), 5500);
    return () => clearInterval(t);
  }, [auto]);
  const role = ROLES.find((r) => r.key === active)!;

  // The preview window swings up from a tilted 3D angle as it scrolls into view.
  const windowRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: windowRef, offset: ["start end", "center center"] });
  const windowRotateX = useTransform(scrollYProgress, [0, 1], [28, 0]);
  const windowRotateY = useTransform(scrollYProgress, [0, 1], [-14, 0]);
  const windowScale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);

  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="One portal, every role" title="Everyone sees exactly what they need" text="Role-specific dashboards show only relevant information and permitted actions." />
        <div className="mt-12 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist">
            {ROLES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={active === r.key}
                onClick={() => {
                  setActive(r.key);
                  setAuto(false);
                }}
                className={cx("relative rounded-xl px-4 py-2 text-sm font-medium transition-colors", active === r.key ? "text-white" : "text-slate-600 hover:text-navy-900")}
              >
                {active === r.key && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-xl bg-navy-900" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <AnimatePresence mode="wait">
            <motion.ul key={role.key} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }} variants={stagger(0.08)} className="flex flex-col gap-4">
              {role.points.map((p) => (
                <motion.li key={p} variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease } } }} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-navy-900">{p}</span>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>

          <div ref={windowRef} className="relative" style={{ perspective: 1200 }}>
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-linear-to-tr from-gold-500/20 to-navy-500/20 blur-2xl" />
            <motion.div style={{ rotateX: windowRotateX, rotateY: windowRotateY, scale: windowScale }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-400">campusone / portal / {role.label.toLowerCase()}</span>
              </div>
              <div className="h-[300px] p-5">
                <AnimatePresence mode="wait">
                  <motion.div key={role.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="h-full">
                    <RoleMock role={role.key} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

const rowIn: Variants = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } };

function RoleMock({ role }: { role: RoleKey }) {
  const { colleges } = useContext(HomeData);
  if (role === "registrar")
    return (
      <motion.div variants={stagger(0.12, 0.1)} initial="hidden" animate="show" className="flex flex-col gap-2.5">
        <p className="text-sm font-semibold text-navy-900">Applications requiring review</p>
        {[
          ["APP-ABC-2026-00014", "BSc Nursing", "Under review", "bg-amber-50 text-amber-700"],
          ["APP-ABC-2026-00015", "BA Management", "Accepted", "bg-emerald-50 text-emerald-700"],
          ["APP-ABC-2026-00016", "BSc Computer Science", "Submitted", "bg-amber-50 text-amber-700"],
          ["APP-ABC-2026-00017", "BA Accounting", "Info required", "bg-sky-50 text-sky-700"],
        ].map(([no, prog, st, cls]) => (
          <motion.div key={no} variants={rowIn} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
            <div>
              <p className="font-mono text-xs text-navy-900">{no}</p>
              <p className="text-xs text-slate-500">{prog}</p>
            </div>
            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{st}</span>
          </motion.div>
        ))}
      </motion.div>
    );
  if (role === "instructor")
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-navy-900">CS102 · Mark sheet</p>
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
          ].map(([id, ca, fin, g], i) => (
            <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * i }} className="grid grid-cols-5 border-t border-slate-100 px-3 py-2.5">
              <span className="col-span-2 font-mono text-navy-900">{id}</span>
              <span>{ca}</span>
              <span>{fin}</span>
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * i + 0.4, type: "spring" }} className="font-bold text-navy-900">
                {g}
              </motion.span>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-4 inline-flex rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-navy-900">
          Submit for approval
        </motion.div>
      </div>
    );
  if (role === "student")
    return (
      <div className="flex h-full items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#d6a84f" strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 3.62 / 4 }} transition={{ duration: 1.4, ease }} />
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
          ].map(([t, c, r], i) => (
            <motion.div key={t} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="rounded-lg border-l-4 border-gold-500 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-navy-900">
                {t} · {c}
              </p>
              <p className="text-xs text-slate-500">{r}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  if (role === "finance")
    return (
      <div className="flex h-full flex-col">
        <p className="text-sm font-semibold text-navy-900">Collections by month</p>
        <div className="mt-4 flex flex-1 items-end gap-3">
          {[45, 62, 38, 80, 71, 92].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <motion.div className="w-full rounded-t-md bg-linear-to-t from-navy-900 to-navy-500" initial={{ height: 0 }} animate={{ height: `${h * 2}px` }} transition={{ delay: i * 0.08, duration: 0.8, ease }} />
              <span className="text-xs text-slate-400">{["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <motion.div variants={stagger(0.12, 0.1)} initial="hidden" animate="show" className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-navy-900">Colleges</p>
      {[
        ...(colleges ?? []).slice(0, 3).map((c) => [c.name, "Active", "bg-emerald-50 text-emerald-700"]),
        ["New college", "Pending setup", "bg-amber-50 text-amber-700"],
      ].map(([n, st, cls]) => (
        <motion.div key={n} variants={rowIn} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
          <span className="text-sm font-medium text-navy-900">{n}</span>
          <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{st}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* --------------------------- Featured college --------------------------- */

function FeaturedCollege() {
  // Chosen on the Website content page; the API falls back to a college with a cover image.
  const { site } = useContext(HomeData);
  return site?.featured ? <FeaturedCard college={site.featured} /> : null;
}

/* --------------------------------- News --------------------------------- */

function News() {
  const { site } = useContext(HomeData);
  if (!site?.news.length) return null;
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="News & announcements" title="What's happening" text="The latest updates from CampusOne and our colleges." />
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {site.news.map((n) => (
            <motion.div key={n._id} variants={fadeUp}>
              <TiltCard max={8}>
                <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl" style={{ transformStyle: "preserve-3d" }}>
                  <div className="flex items-center justify-between gap-2 text-xs" style={{ transform: "translateZ(20px)" }}>
                    <span className="rounded-full bg-gold-50 px-2.5 py-1 font-medium text-gold-700">{n.college?.name ?? "CampusOne"}</span>
                    <time className="text-slate-400">{fmtDate(n.createdAt)}</time>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-navy-900" style={{ transform: "translateZ(30px)" }}>
                    {n.title}
                  </h3>
                  <p className="mt-2 line-clamp-4 flex-1 text-sm text-slate-600">{n.body}</p>
                  {n.college && (
                    <Link href={`/colleges/${n.college.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:text-navy-900">
                      Visit college <Icon name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </article>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturedCard({ college }: { college: College }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const accent = college.brandColor ?? "#d6a84f";

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Featured college" title={college.name} text={college.tagline} />
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="mt-12 grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.4fr_1fr]"
          style={{ borderTop: `4px solid ${accent}` }}
        >
          <div className="relative aspect-[2/1] overflow-hidden lg:aspect-auto lg:min-h-[340px]">
            <motion.div style={{ y: imageY }} className="absolute -inset-[8%]">
              <Image src={college.coverImage!} alt={`${college.name} banner`} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 60vw, 100vw" />
            </motion.div>
          </div>
          <div className="flex flex-col justify-center gap-5 p-8 lg:p-10">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ rotate: 6, scale: 1.05 }} className="rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
                <Image src={collegeLogo(college.logoFileId)} alt={`${college.name} logo`} width={72} height={72} unoptimized className="h-16 w-16 object-contain" />
              </motion.div>
              <div>
                <p className="font-mono text-sm" style={{ color: accent }}>
                  {college.code}
                </p>
                <p className="text-xl font-bold text-navy-900">{college.name}</p>
                {college.address && <p className="text-sm text-slate-500">📍 {college.address}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-navy-900">{college.programCount} programs</span>
              {college.admissionsOpen && <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">Admissions open</span>}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/colleges/${college.slug}`} className="rounded-xl px-5 py-3 font-semibold text-white shadow-lg transition hover:opacity-90" style={{ backgroundColor: accent }}>
                Explore programs
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

/* ------------------------------- Colleges ------------------------------- */

function CollegesSection() {
  const { colleges } = useContext(HomeData);
  if (!colleges?.length) return null;
  return (
    <section className="relative overflow-hidden bg-navy-900 py-24">
      <div className="bg-grid absolute inset-0" />
      <motion.div className="absolute top-1/3 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gold-500/15 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading light eyebrow="Directory" title="Find your college" text="Spin through the colleges on CampusOne — explore programs and apply directly." />
        <motion.div initial={{ opacity: 0, y: 60, rotateX: 25 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 1, ease }} className="mt-14" style={{ perspective: 1200 }}>
          <CollegeCarousel3D colleges={colleges} />
        </motion.div>
        <div className="mt-10 text-center">
          <Link href="/colleges" className="inline-flex items-center gap-2 font-semibold text-gold-400 hover:text-gold-500">
            View the full directory <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- FAQ ---------------------------------- */

function Faq() {
  const { content } = useContext(HomeData);
  const [open, setOpen] = useState<number | null>(0);
  const FAQS = content.faqs.map((f) => [f.q, f.a] as const);
  if (!FAQS.length) return null;
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="Questions" title="Frequently asked" />
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map(([q, a], i) => (
            <motion.div key={q} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-navy-900" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {q}
                <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                  <Icon name="plus" className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                    <p className="px-5 pb-5 text-slate-600">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
  const ctaLast = words.pop() ?? "";
  const ctaHead = words.join(" ");
  return (
    <section className="px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#102a43,#1b3a5c,#243b53,#102a43)] bg-[length:300%_300%] px-6 py-16 text-center shadow-2xl animate-gradient sm:px-16"
      >
        <motion.div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold-500/30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <motion.div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 9, repeat: Infinity }} />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {/* The last word of the title is drawn in gold. */}
            {ctaHead} <span className="text-gold-gradient">{ctaLast}</span>
          </h2>
          {content.ctaText && <p className="mx-auto mt-4 max-w-xl text-lg text-navy-100">{content.ctaText}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <MagneticLink href="/apply" primary>
              Start your application <Icon name="arrow" className="h-4 w-4" />
            </MagneticLink>
            <MagneticLink href="/login">Sign in to the portal</MagneticLink>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
