import Image from "next/image";
import Link from "next/link";
import { CollegeGrid } from "@/components/college-grid";
import { PublicPage } from "@/components/site";

const FEATURES = [
  { title: "Admissions", text: "Online applications with document upload, screening, and one-click conversion of accepted applicants into student records." },
  { title: "Registration", text: "Course registration that enforces prerequisites, capacity, credit limits, timetable conflicts and fee clearance." },
  { title: "Grades & transcripts", text: "Instructor mark entry with an approval workflow: department review, registrar publication, and audited corrections." },
  { title: "Attendance & timetables", text: "Session attendance, conflict-checked timetables, and personal schedules for students and instructors." },
  { title: "Fees & finance", text: "Invoices, verified payments, receipts and balance tracking in exact currency amounts." },
  { title: "Excel in, Excel out", text: "Registrars import students and export reports; instructors download class lists and upload grade sheets." },
];

export default function Home() {
  return (
    <PublicPage>
      <section className="relative overflow-hidden bg-navy-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(214,168,79,0.18),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">College Management Platform</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">One Portal. Multiple Colleges. One Connected Future.</h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100">
              A unified digital platform for academic administration, student success, and institutional excellence — each college runs independently, securely, on one system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/colleges" className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-navy-900 hover:bg-gold-400">
                Find a college
              </Link>
              <Link href="/apply" className="rounded-lg border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">
                Apply online
              </Link>
              <Link href="/login" className="rounded-lg px-5 py-3 font-semibold text-navy-100 hover:text-white">
                Sign in →
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image src="/logo.png" alt="CampusOne logo" width={360} height={360} priority className="w-56 rounded-3xl bg-white p-6 shadow-2xl sm:w-72" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy-900">Everything a college runs on</h2>
        <p className="mt-2 max-w-2xl text-slate-600">Role-based portals for super admins, college admins, registrars, deans, department heads, instructors, finance officers and students.</p>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 h-1 w-10 rounded bg-gold-500" />
              <h3 className="font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-navy-900">Colleges on CampusOne</h2>
              <p className="mt-1 text-slate-600">Explore programs and apply directly.</p>
            </div>
            <Link href="/colleges" className="text-sm font-semibold text-navy-600 hover:underline">
              View all colleges →
            </Link>
          </div>
          <CollegeGrid limit={6} />
        </div>
      </section>
    </PublicPage>
  );
}
