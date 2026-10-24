"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { fmtDate, useApi } from "@/lib/client";
import { Icon } from "./icons";
import { collegeLogo } from "./site";
import { Badge, Card, Empty, Loading } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ease = [0.22, 1, 0.36, 1] as const;

export function CollegeProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading } = useApi<any>(`/public/colleges/${slug}`);

  if (loading && !data) return <div className="pt-24"><Loading /></div>;
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
  const accent = c.brandColor ?? "#d6a84f";
  const openPrograms = data.programs.filter((p: any) => p.admissionOpen).length;

  return (
    <>
      <section className="relative overflow-hidden bg-navy-900">
        {c.coverImage && (
          <motion.div initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease }} className="absolute inset-0">
            <Image src={c.coverImage} alt="" fill unoptimized priority className="object-cover" sizes="100vw" />
          </motion.div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-navy-900 via-navy-900/85 to-navy-900/40" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-4 pt-24 pb-12 sm:px-6 sm:pt-32">
          <motion.div initial={{ y: 30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: 0.7, ease }} className="rounded-2xl bg-white p-2 shadow-2xl" style={{ boxShadow: `0 0 0 4px ${accent}` }}>
            <Image src={collegeLogo(c.logoFileId)} alt={`${c.name} logo`} width={112} height={112} unoptimized className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.15, ease }} className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold text-gold-400">
              {c.code}
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{c.name}</h1>
            {c.tagline && <p className="mt-1 text-lg text-navy-100">{c.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1 text-white backdrop-blur">{data.programs.length} programs</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-white backdrop-blur">{data.departments.length} departments</span>
              {openPrograms > 0 && data.admissionsEnabled && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200 backdrop-blur">Admissions open</span>}
            </div>
          </motion.div>
          {data.admissionsEnabled && openPrograms > 0 && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: "spring", stiffness: 200 }}>
              <Link href={`/apply?college=${c.slug}`} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg transition hover:opacity-90" style={{ backgroundColor: accent }}>
                Apply now <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {c.description && (
            <Reveal>
              <Card title="About">
                <p className="whitespace-pre-line text-slate-700">{c.description}</p>
              </Card>
            </Reveal>
          )}
          <Reveal delay={0.05}>
            <Card title={`Programs (${data.programs.length})`}>
              {data.programs.length ? (
                <ul className="flex flex-col gap-3">
                  {data.programs.map((p: any, i: number) => (
                    <motion.li
                      key={p._id}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, ease }}
                      className="rounded-xl border border-slate-100 p-4 transition hover:border-slate-200 hover:shadow-md"
                      style={{ borderLeft: `4px solid ${accent}` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-navy-900">{p.name}</h3>
                          <p className="text-xs text-slate-500">
                            {p.level} · {p.durationYears} years · {p.totalCredits} credits · {p.department?.name}
                          </p>
                        </div>
                        {p.admissionOpen && data.admissionsEnabled ? (
                          <Link href={`/apply?college=${c.slug}&program=${p._id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:underline">
                            Apply <Icon name="arrow" className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Badge>Admissions closed</Badge>
                        )}
                      </div>
                      {p.description && <p className="mt-2 text-sm text-slate-600">{p.description}</p>}
                      {p.admissionRequirements && (
                        <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                          <b className="text-navy-900">Requirements:</b> {p.admissionRequirements}
                        </p>
                      )}
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Programs will be published soon.</p>
              )}
            </Card>
          </Reveal>
        </div>
        <div className="flex flex-col gap-6">
          {(c.address || c.phone || c.email || c.website) && (
            <Reveal delay={0.1}>
              <Card title="Contact">
                <ul className="flex flex-col gap-2 text-sm text-slate-700">
                  {c.address && <li>📍 {c.address}</li>}
                  {c.phone && <li>📞 {c.phone}</li>}
                  {c.email && <li>✉️ <a className="text-navy-600 hover:underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
                  {c.website && <li>🌐 <a className="text-navy-600 hover:underline" href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">{c.website}</a></li>}
                </ul>
              </Card>
            </Reveal>
          )}
          <Reveal delay={0.15}>
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
          </Reveal>
          {!!data.announcements.length && (
            <Reveal delay={0.2}>
              <Card title="Announcements">
                <ul className="flex flex-col gap-4">
                  {data.announcements.map((a: any) => (
                    <li key={a._id}>
                      <p className="font-medium text-navy-900">{a.title}</p>
                      <p className="text-sm text-slate-600">{a.body}</p>
                      <p className="text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          )}
        </div>
      </div>
    </>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, delay, ease }}>
      {children}
    </motion.div>
  );
}
