"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { Button, Card, ErrorBox, Input, Notice, Select, Textarea } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const EMPTY = { firstName: "", lastName: "", email: "", phone: "", gender: "", dateOfBirth: "", address: "", previousSchool: "", previousResult: "", statement: "" };

export function ApplicationForm() {
  const params = useSearchParams();
  const [collegeSlug, setCollegeSlug] = useState(params.get("college") ?? "");
  const [program, setProgram] = useState(params.get("program") ?? "");
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const colleges = useApi<{ items: any[] }>("/public/colleges");
  const college = useApi<any>(collegeSlug ? `/public/colleges/${collegeSlug}` : null);
  const openPrograms = (college.data?.programs ?? []).filter((p: any) => p.admissionOpen);

  useEffect(() => {
    if (college.data && program && !openPrograms.some((p: any) => p._id === program)) setProgram("");
  }, [college.data, program, openPrograms]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!files.length) return setError("Please attach at least one document.");
    setSubmitting(true);
    const data = new FormData();
    data.append("program", program);
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    files.forEach((f) => data.append("documents", f));
    try {
      const res = await api("/public/apply", { form: data });
      setDone(res.applicationNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div>
          <h2 className="text-xl font-semibold text-navy-900">Application submitted</h2>
          <p className="text-slate-600">Your application number is</p>
          <p className="rounded-lg bg-navy-50 px-4 py-2 font-mono text-lg font-bold text-navy-900">{done}</p>
          <p className="max-w-md text-sm text-slate-600">Keep this number. You can check your status any time with it and your email address.</p>
          <Link href={`/admissions?number=${done}`} className="font-semibold text-navy-600 hover:underline">
            Check application status →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card title="1. Program">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="College"
            required
            value={collegeSlug}
            onChange={(e) => {
              setCollegeSlug(e.target.value);
              setProgram("");
            }}
            options={(colleges.data?.items ?? []).filter((c) => c.admissionsOpen).map((c) => ({ value: c.slug, label: c.name }))}
            placeholder="Select a college…"
          />
          <Select
            label="Program"
            required
            value={program}
            disabled={!collegeSlug}
            onChange={(e) => setProgram(e.target.value)}
            options={openPrograms.map((p: any) => ({ value: p._id, label: `${p.name} (${p.level})` }))}
            placeholder={collegeSlug ? (openPrograms.length ? "Select a program…" : "No programs open") : "Choose a college first"}
          />
        </div>
        {program && openPrograms.find((p: any) => p._id === program)?.admissionRequirements && (
          <div className="mt-4">
            <Notice>
              <b>Requirements:</b> {openPrograms.find((p: any) => p._id === program).admissionRequirements}
            </Notice>
          </div>
        )}
      </Card>

      <Card title="2. Personal details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" required value={form.firstName} onChange={set("firstName")} />
          <Input label="Last name" required value={form.lastName} onChange={set("lastName")} />
          <Input label="Email" type="email" required value={form.email} onChange={set("email")} />
          <Input label="Phone" required value={form.phone} onChange={set("phone")} />
          <Select label="Gender" value={form.gender} onChange={set("gender")} options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} placeholder="Select…" />
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          <Input label="Address" className="sm:col-span-2" value={form.address} onChange={set("address")} />
        </div>
      </Card>

      <Card title="3. Education & documents">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Previous school" required value={form.previousSchool} onChange={set("previousSchool")} />
          <Input label="Result / GPA / exam score" value={form.previousResult} onChange={set("previousResult")} />
          <Textarea label="Personal statement (optional)" className="sm:col-span-2" value={form.statement} onChange={set("statement")} />
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-navy-900">
              Documents <span className="text-red-600">*</span>
            </label>
            <p className="mb-2 text-xs text-slate-500">Transcript, certificates and ID. PDF, JPG or PNG, up to 5 MB each, at most 4 files.</p>
            <input
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
            />
            {!!files.length && (
              <ul className="mt-2 text-xs text-slate-600">
                {files.map((f) => (
                  <li key={f.name}>📎 {f.name} ({Math.round(f.size / 1024)} KB)</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <ErrorBox message={error} />
      <div>
        <Button type="submit" variant="gold" loading={submitting} disabled={!program}>
          Submit application
        </Button>
      </div>
    </form>
  );
}
