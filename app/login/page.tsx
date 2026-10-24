import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LoginVisual } from "@/components/login-visual";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <div className="bg-grid absolute inset-0" />
        <Link href="/" className="relative flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-md bg-white p-0.5" />
          <span className="text-xl font-bold text-white">CampusOne</span>
        </Link>
        <LoginVisual />
        <p className="relative text-xs text-navy-200">Protected system. Activity is logged.</p>
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
