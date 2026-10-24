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
      <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {items.map((c, i) => (
            <motion.div
              key={c._id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -6 }}
            >
              <Link href={`/colleges/${c.slug}`} className="group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl">
                <div className="h-1.5" style={{ background: c.brandColor ?? "#102a43" }} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <Image src={collegeLogo(c.logoFileId)} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-xl border border-slate-100 object-contain p-1 transition-transform duration-300 group-hover:scale-110" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gold-700">{c.code}</p>
                      <h3 className="font-semibold text-navy-900">{c.name}</h3>
                      {c.tagline && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{c.tagline}</p>}
                    </div>
                  </div>
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
