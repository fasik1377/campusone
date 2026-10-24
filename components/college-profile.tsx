"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fmtDate, useApi } from "@/lib/client";
import { collegeLogo } from "./site";
import { Badge, Card, Empty, Loading } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function CollegeProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading } = useApi<any>(`/public/colleges/${slug}`);

  if (loading && !data) return <Loading />;
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Empty title="College not found">
          <Link href="/colleges" className="text-navy-600 underline">
            Back to the directory
          </Link>
        </Empty>
      </div>
    );

  const c = data.item;
  return (
    <>
      <section className="bg-navy-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-12 sm:px-6">
          <Image src={collegeLogo(c.logoFileId)} alt={`${c.name} logo`} width={96} height={96} unoptimized className="h-24 w-24 rounded-xl bg-white object-contain p-2" />
          <div>
            <p className="font-mono text-sm text-gold-500">{c.code}</p>
            <h1 className="text-3xl font-bold text-white">{c.name}</h1>
            {c.tagline && <p className="mt-1 text-navy-100">{c.tagline}</p>}
          </div>
          {data.admissionsEnabled && (
            <Link href={`/apply?college=${c.slug}`} className="ml-auto rounded-lg bg-gold-500 px-5 py-3 font-semibold text-navy-900 hover:bg-gold-400">
              Apply now
            </Link>
          )}
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {c.description && (
            <Card title="About">
              <p className="whitespace-pre-line text-sm text-slate-700">{c.description}</p>
            </Card>
          )}
          <Card title={`Programs (${data.programs.length})`}>
            {data.programs.length ? (
              <ul className="divide-y divide-slate-100">
                {data.programs.map((p: any) => (
                  <li key={p._id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-navy-900">{p.name}</h3>
                        <p className="text-xs text-slate-500">
                          {p.level} · {p.durationYears} years · {p.totalCredits} credits · {p.department?.name}
                        </p>
                      </div>
                      {p.admissionOpen && data.admissionsEnabled ? (
                        <Link href={`/apply?college=${c.slug}&program=${p._id}`} className="text-sm font-semibold text-navy-600 hover:underline">
                          Apply →
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
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Programs will be published soon.</p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Contact">
            <ul className="flex flex-col gap-2 text-sm text-slate-700">
              {c.address && <li>📍 {c.address}</li>}
              {c.phone && <li>📞 {c.phone}</li>}
              {c.email && <li>✉️ <a className="text-navy-600 hover:underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c.website && <li>🌐 <a className="text-navy-600 hover:underline" href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">{c.website}</a></li>}
            </ul>
          </Card>
          <Card title="Departments">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {data.departments.map((d: any) => (
                <li key={d._id}>{d.name}</li>
              ))}
            </ul>
          </Card>
          {!!data.announcements.length && (
            <Card title="Announcements">
              <ul className="flex flex-col gap-3">
                {data.announcements.map((a: any) => (
                  <li key={a._id}>
                    <p className="font-medium text-navy-900">{a.title}</p>
                    <p className="text-sm text-slate-600">{a.body}</p>
                    <p className="text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
