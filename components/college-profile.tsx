"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { fmtDate, useApi } from "@/lib/client";
import { CollegeLoginCard } from "./college-login";
import { Icon, type IconName } from "./icons";
import { collegeLogo } from "./site";
import { TiltCard } from "./three-d";
import { Badge, Card, Empty, Loading } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ease = [0.22, 1, 0.36, 1] as const;

const PORTAL_PERKS: { icon: IconName; title: string; text: string }[] = [
  { icon: "admissions", title: "Apply online", text: "Submit your application and documents from anywhere, then track its status." },
  { icon: "registration", title: "Register for courses", text: "Choose eligible courses each semester and see your timetable instantly." },
  { icon: "grades", title: "Grades & transcript", text: "View published results, GPA and graduation progress in your portal." },
  { icon: "finance", title: "Fees made clear", text: "See invoices, payments and balances without visiting the office." },
];

export function CollegeProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading } = useApi<any>(`/public/colleges/${slug}`);

  if (loading && !data)
    return (
      <div className="pt-24">
        <Loading />
      </div>
    );
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-16">
        <Empty title="College not found">
          <Link href="/colleges" className="text-navy-600 underline">
            Back to the directory
          </Link>
        </Empty>
      </div>
    );

  const c = data.item;
  const accent: string = c.brandColor ?? "#d6a84f";
  const openPrograms = data.programs.filter((p: any) => p.admissionOpen);
  const canApply = data.admissionsEnabled && openPrograms.length > 0;

  return (
    <>
      {/* Hero: banner, bold logo, name and calls to action */}
      <section className="relative overflow-hidden bg-navy-900">
        {c.coverImage && (
          <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease }} className="absolute inset-0">
            <Image src={c.coverImage} alt="" fill unoptimized priority className="object-cover" sizes="100vw" />
          </motion.div>
        )}
        <div className="absolute inset-0 bg-linear-to-r from-navy-900 via-navy-900/85 to-navy-900/30" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:grid-cols-[auto_1fr]">
          <TiltCard max={14} glare className="w-fit">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.9, ease }}
              className="rounded-[2rem] bg-white p-4 shadow-2xl"
              style={{ boxShadow: `0 0 0 6px ${accent}, 0 30px 60px -15px rgba(0,0,0,0.6)` }}
            >
              <Image src={collegeLogo(c.logoFileId)} alt={`${c.name} logo`} width={220} height={220} unoptimized priority className="h-40 w-40 object-contain sm:h-52 sm:w-52" />
            </motion.div>
          </TiltCard>
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.15, ease }}>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-semibold text-gold-400 backdrop-blur">{c.code}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{c.name}</h1>
            {c.tagline && <p className="mt-3 max-w-2xl text-xl text-navy-100">{c.tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {canApply && (
                <Link href={`/apply?college=${c.slug}`} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110" style={{ backgroundColor: accent }}>
                  Apply now <Icon name="arrow" className="h-4 w-4" />
                </Link>
              )}
              <a href="#signin" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20">
                Portal sign in
              </a>
              <a href="#programs" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-navy-100 transition hover:text-white">
                Explore programs ↓
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6, ease }} className="mx-auto grid max-w-5xl grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:grid-cols-4">
          {[
            [data.programs.length, "Programs"],
            [data.departments.length, "Departments"],
            [openPrograms.length, "Open for admission"],
            [canApply ? "Open" : "Closed", "Admissions"],
          ].map(([value, label]) => (
            <div key={label as string} className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl" style={{ color: accent }}>
                {value}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-8">
          {c.description && (
            <Reveal>
              <Card title={`About ${c.name}`}>
                <p className="whitespace-pre-line text-lg leading-relaxed text-slate-700">{c.description}</p>
              </Card>
            </Reveal>
          )}

          <Reveal>
            <div>
              <h2 className="mb-4 text-2xl font-bold text-navy-900">Your studies, online</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {PORTAL_PERKS.map((p, i) => (
                  <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, ease }}>
                    <TiltCard max={8}>
                      <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ transformStyle: "preserve-3d" }}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg" style={{ backgroundColor: accent, transform: "translateZ(30px)" }}>
                          <Icon name={p.icon} className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-navy-900">{p.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{p.text}</p>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          <section id="programs" className="scroll-mt-24">
            <h2 className="mb-4 text-2xl font-bold text-navy-900">Programs ({data.programs.length})</h2>
            {data.programs.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.programs.map((p: any, i: number) => (
                  <motion.article
                    key={p._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 2) * 0.08, ease }}
                    whileHover={{ y: -4 }}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                    style={{ borderTop: `4px solid ${accent}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-navy-900">{p.name}</h3>
                      {p.admissionOpen && data.admissionsEnabled ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.level} · {p.durationYears} years · {p.totalCredits} credits · {p.department?.name}
                    </p>
                    {p.description && <p className="mt-3 text-sm text-slate-600">{p.description}</p>}
                    {p.admissionRequirements && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <b className="text-navy-900">Requirements:</b> {p.admissionRequirements}
                      </p>
                    )}
                    {p.admissionOpen && data.admissionsEnabled && (
                      <Link href={`/apply?college=${c.slug}&program=${p._id}`} className="mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold hover:underline" style={{ color: accent }}>
                        Apply to this program <Icon name="arrow" className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </motion.article>
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-slate-500">Programs will be published soon.</p>
              </Card>
            )}
          </section>

          {!!data.announcements.length && (
            <Reveal>
              <div>
                <h2 className="mb-4 text-2xl font-bold text-navy-900">News & announcements</h2>
                <div className="flex flex-col gap-3">
                  {data.announcements.map((a: any) => (
                    <div key={a._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ borderLeft: `4px solid ${accent}` }}>
                      <p className="text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                      <p className="mt-1 font-semibold text-navy-900">{a.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {canApply && (
            <Reveal>
              <div className="overflow-hidden rounded-3xl p-8 text-center text-white shadow-xl sm:p-12" style={{ background: `linear-gradient(135deg, ${accent}, #102a43)` }}>
                <h2 className="text-3xl font-bold">Join {c.name}</h2>
                <p className="mx-auto mt-2 max-w-lg text-white/85">Applications are open for {openPrograms.length} program{openPrograms.length === 1 ? "" : "s"}. Apply online in a few minutes.</p>
                <Link href={`/apply?college=${c.slug}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-navy-900 shadow-lg transition hover:bg-gold-50">
                  Start your application <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <CollegeLoginCard slug={c.slug} collegeName={c.name} accent={accent} />
          {(c.address || c.phone || c.email || c.website) && (
            <Card title="Contact">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                {c.address && <li>📍 {c.address}</li>}
                {c.phone && <li>📞 {c.phone}</li>}
                {c.email && <li>✉️ <a className="text-navy-600 hover:underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
                {c.website && <li>🌐 <a className="text-navy-600 hover:underline" href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">{c.website}</a></li>}
              </ul>
            </Card>
          )}
          {!!data.departments.length && (
            <Card title="Departments">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                {data.departments.map((d: any) => (
                  <li key={d._id} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                    {d.name}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, ease }}>
      {children}
    </motion.div>
  );
}
