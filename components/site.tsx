import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-md bg-white p-0.5" priority />
          <span>
            <span className="block text-lg font-bold leading-tight text-white">CampusOne</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-gold-500">College Management Platform</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2" aria-label="Main">
          <Link href="/colleges" className="hidden rounded-lg px-3 py-2 text-navy-100 hover:bg-white/10 hover:text-white sm:block">
            Colleges
          </Link>
          <Link href="/admissions" className="hidden rounded-lg px-3 py-2 text-navy-100 hover:bg-white/10 hover:text-white sm:block">
            Admissions
          </Link>
          <Link href="/apply" className="rounded-lg px-3 py-2 text-navy-100 hover:bg-white/10 hover:text-white">
            Apply
          </Link>
          <Link href="/login" className="rounded-lg bg-gold-500 px-4 py-2 font-semibold text-navy-900 hover:bg-gold-400">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-900 text-navy-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-bold text-white">CampusOne</p>
          <p className="mt-1 text-sm italic text-gold-500">One Portal. Multiple Colleges. One Connected Future.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">Explore</p>
          <ul className="flex flex-col gap-1">
            <li><Link className="hover:text-white" href="/colleges">College directory</Link></li>
            <li><Link className="hover:text-white" href="/apply">Apply online</Link></li>
            <li><Link className="hover:text-white" href="/admissions">Check application status</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">Support</p>
          <p>Contact your college registrar for academic questions, or the platform administrator for account access.</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-navy-200">© {2026} CampusOne. All rights reserved.</p>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

export function collegeLogo(logoFileId?: string | null) {
  return logoFileId ? `/api/v1/files/${logoFileId}` : "/logo.png";
}
