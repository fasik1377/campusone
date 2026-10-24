import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";
import { PageHero } from "@/components/page-hero";
import { PublicPage } from "@/components/site";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "Apply online" };

export default function ApplyPage() {
  return (
    <PublicPage active="/apply">
      <PageHero eyebrow="Admissions" title="Apply online" text="Choose a college and program, fill in your details and upload your documents. You will receive an application number to track your status." />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Suspense fallback={<Loading />}>
          <ApplicationForm />
        </Suspense>
      </div>
    </PublicPage>
  );
}
