import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1">
      <div className="hidden flex-1 flex-col justify-between bg-navy-900 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-md bg-white p-0.5" />
          <span className="text-xl font-bold text-white">CampusOne</span>
        </Link>
        <div>
          <p className="text-4xl font-bold leading-tight text-white">
            One Portal.
            <br />
            Multiple Colleges.
            <br />
            <span className="text-gold-500">One Connected Future.</span>
          </p>
          <p className="mt-4 max-w-md text-navy-100">Sign in to your role-specific portal — administration, registry, teaching, finance or student services.</p>
        </div>
        <p className="text-xs text-navy-200">Protected system. Activity is logged.</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="" width={40} height={40} />
            <span className="text-xl font-bold text-navy-900">CampusOne</span>
          </Link>
          <h1 className="text-2xl font-bold text-navy-900">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">Use the username (or email) and password given by your college.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-8 text-center text-sm text-slate-500">
            New applicant?{" "}
            <Link href="/apply" className="font-semibold text-navy-600 hover:underline">
              Apply online
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
