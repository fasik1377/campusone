import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationStatus } from "@/components/application-status";
import { PageHero } from "@/components/page-hero";
import { PublicPage } from "@/components/site";

export const metadata: Metadata = { title: "Admissions" };

export default function AdmissionsPage() {
  return (
    <PublicPage active="/admissions">
      <PageHero eyebrow="Admissions" title="Join a CampusOne college" text="Every college on CampusOne accepts applications online. Track your application any time." />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">How it works</h2>
          <ol className="mt-5 flex flex-col gap-4">
            {[
              ["Choose a college and program", "Browse the directory and read each program's requirements."],
              ["Apply and upload documents", "Submit your details with your transcript, certificates and ID."],
              ["Review", "Admissions staff verify your documents and eligibility. They may ask for more information."],
              ["Decision", "If accepted, you receive a student ID and portal login to register for courses."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-gold-500">{i + 1}</span>
                <span>
                  <b className="text-navy-900">{title}</b>
                  <span className="block text-sm text-slate-600">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex gap-3">
            <Link href="/apply" className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-navy-900 hover:bg-gold-400">
              Start an application
            </Link>
            <Link href="/colleges" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-navy-900 hover:bg-slate-50">
              Browse colleges
            </Link>
          </div>
        </div>
        <Suspense>
          <ApplicationStatus />
        </Suspense>
      </div>
    </PublicPage>
  );
}
