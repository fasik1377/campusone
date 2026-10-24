"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/client";
import { collegeLogo } from "./site";
import { Badge, Empty, inputClass, Loading } from "./ui";

type College = { _id: string; name: string; code: string; slug: string; tagline?: string; address?: string; logoFileId?: string; programCount: number; admissionsOpen: boolean };

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
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code or location…" aria-label="Search colleges" className={`${inputClass} mb-6 max-w-lg py-3`} />
      )}
      {loading && !data && <Loading />}
      {error && <p className="text-sm text-slate-500">The college directory is temporarily unavailable.</p>}
      {data && !items.length && <Empty title="No colleges found" />}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link key={c._id} href={`/colleges/${c.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-4">
              <Image src={collegeLogo(c.logoFileId)} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg border border-slate-100 object-contain p-1" />
              <div className="min-w-0">
                <p className="font-mono text-xs text-gold-700">{c.code}</p>
                <h3 className="font-semibold text-navy-900 group-hover:underline">{c.name}</h3>
                {c.tagline && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{c.tagline}</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {c.address && <span>📍 {c.address}</span>}
              <span>{c.programCount} programs</span>
              {c.admissionsOpen && <Badge tone="green">Admissions open</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
