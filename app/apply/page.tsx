import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";
import { PublicPage } from "@/components/site";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "Apply online" };

export default function ApplyPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-navy-900">Apply online</h1>
        <p className="mt-2 mb-8 text-slate-600">Choose a college and program, fill in your details and upload your documents. You will receive an application number to track your status.</p>
        <Suspense fallback={<Loading />}>
          <ApplicationForm />
        </Suspense>
      </div>
    </PublicPage>
  );
}
