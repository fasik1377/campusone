import type { Metadata } from "next";
import { CollegeGrid } from "@/components/college-grid";
import { PageHero } from "@/components/page-hero";
import { PublicPage } from "@/components/site";

export const metadata: Metadata = { title: "College directory" };

export default function CollegesPage() {
  return (
    <PublicPage active="/colleges">
      <PageHero eyebrow="Directory" title="Find your college" text="Browse colleges on CampusOne, explore their programs and admission requirements, and apply online." />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <CollegeGrid searchable />
      </div>
    </PublicPage>
  );
}
