import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FooterContact, FooterTagline } from "./footer-content";
import { SiteHeader } from "./site-header";

export { SiteHeader };

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-navy-900 text-navy-100">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold-500/60 to-transparent" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={44} height={44} className="rounded-lg bg-white p-0.5" />
            <span className="text-xl font-bold text-white">CampusOne</span>
          </Link>
          <p className="mt-3 text-sm italic text-gold-500">One Portal. Multiple Colleges. One Connected Future.</p>
          <FooterTagline />
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Explore</p>
          <ul className="flex flex-col gap-2">
            <li><Link className="transition hover:text-gold-400" href="/colleges">College directory</Link></li>
            <li><Link className="transition hover:text-gold-400" href="/apply">Apply online</Link></li>
            <li><Link className="transition hover:text-gold-400" href="/admissions">Check application status</Link></li>
            <li><Link className="transition hover:text-gold-400" href="/login">Staff &amp; student sign in</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Contact</p>
          <FooterContact />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-navy-200 sm:flex-row sm:px-6">
          <p>© 2026 CampusOne. All rights reserved.</p>
          <p>
            Developed by{" "}
            <a
              href="https://fasik1377.github.io/fasika-abera/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gold-400 underline-offset-4 transition hover:text-gold-500 hover:underline"
            >
              Fasika Abera
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicPage({ children, overlay, active }: { children: ReactNode; overlay?: boolean; active?: string }) {
  return (
    <>
      <SiteHeader overlay={overlay} active={active} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

export function collegeLogo(logoFileId?: string | null) {
  return logoFileId ? `/api/v1/files/${logoFileId}` : "/logo.png";
}
