import type { Metadata } from "next";
import { CollegeGrid } from "@/components/college-grid";
import { PublicPage } from "@/components/site";

export const metadata: Metadata = { title: "College directory" };

export default function CollegesPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-navy-900">College directory</h1>
        <p className="mt-2 mb-8 text-slate-600">Browse colleges on CampusOne, explore their programs, and apply online.</p>
        <CollegeGrid searchable />
      </div>
    </PublicPage>
  );
}
