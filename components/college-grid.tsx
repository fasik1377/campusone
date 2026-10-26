"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/client";
import { Icon } from "./icons";
import { collegeLogo } from "./site";
import { Badge, Empty, inputClass, Loading } from "./ui";

type College = { _id: string; name: string; code: string; slug: string; tagline?: string; address?: string; logoFileId?: string; brandColor?: string; programCount: number; admissionsOpen: boolean };

/** Wide showcase used when the directory lists a single college. */
function FeaturedCollegeCard({ college: c }: { college: College }) {
  const accent = c.brandColor ?? "#102a43";
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/colleges/${c.slug}`} className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-shadow hover:shadow-2xl md:grid-cols-[minmax(0,2fr)_3fr]">
        <div className="relative flex min-h-72 items-center justify-center p-10" style={{ background: `linear-gradient(135deg, ${accent}, #102a43)` }}>
          <div className="bg-grid absolute inset-0 opacity-60" />
          <motion.div whileHover={{ rotate: -4, scale: 1.05 }} transition={{ type: "spring", stiffness: 200 }} className="relative rounded-[2rem] bg-white p-4 shadow-2xl">
            <Image src={collegeLogo(c.logoFileId)} alt={`${c.name} logo`} width={220} height={220} unoptimized priority className="h-44 w-44 object-contain sm:h-52 sm:w-52" />
          </motion.div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-8 sm:p-10">
          <p className="font-mono text-sm font-semibold" style={{ color: accent }}>
            {c.code}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{c.name}</h2>
          {c.tagline && <p className="text-lg text-slate-600">{c.tagline}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {c.address && <span>📍 {c.address}</span>}
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-navy-900">{c.programCount} programs</span>
            {c.admissionsOpen && <Badge tone="green">Admissions open</Badge>}
          </div>
          <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-lg transition-transform group-hover:translate-x-1" style={{ backgroundColor: accent }}>
            Visit college & sign in <Icon name="arrow" className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function CollegeGrid({ limit, searchable }: { limit?: number; searchable?: boolean }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading, error } = useApi<{ items: College[] }>(`/public/colleges${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const items = (data?.items ?? []).slice(0, limit ?? 1000);

  return (
    <div>
      {searchable && (
        <div className="relative mb-8 max-w-lg">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code or location…" aria-label="Search colleges" className={`${inputClass} py-3 pl-4 shadow-sm`} />
        </div>
      )}
      {loading && !data && <Loading />}
      {error && <p className="text-sm text-slate-500">The college directory is temporarily unavailable.</p>}
      {data && !items.length && <Empty title="No colleges found" />}
      {items.length === 1 && <FeaturedCollegeCard college={items[0]} />}
      <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {items.length > 1 && items.map((c, i) => (
            <motion.div
              key={c._id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -6 }}
            >
              <Link href={`/colleges/${c.slug}`} className="group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl">
                <div className="relative flex h-40 items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.brandColor ?? "#102a43"}, #102a43)` }}>
                  <div className="bg-grid absolute inset-0 opacity-50" />
                  <Image src={collegeLogo(c.logoFileId)} alt={`${c.name} logo`} width={112} height={112} unoptimized className="relative h-28 w-28 rounded-2xl bg-white object-contain p-2 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                </div>
                <div className="p-5">
                  <p className="font-mono text-xs text-gold-700">{c.code}</p>
                  <h3 className="text-lg font-bold text-navy-900">{c.name}</h3>
                  {c.tagline && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{c.tagline}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {c.address && <span>📍 {c.address}</span>}
                    <span>{c.programCount} programs</span>
                    {c.admissionsOpen && <Badge tone="green">Admissions open</Badge>}
                    <span className="ml-auto inline-flex items-center gap-1 font-semibold text-navy-600 transition-transform group-hover:translate-x-1">
                      View <Icon name="arrow" className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
