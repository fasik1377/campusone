"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cx } from "./ui";
import { useSite } from "./use-site";

const DISMISS_KEY = "campusone:dismissed-bar";

function AnnouncementBar() {
  const site = useSite();
  const bar = site?.content.announcementBar;
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      // Storage unavailable (private mode); the bar simply shows.
    }
  }, []);
  const visible = !!bar?.enabled && !!bar.text && dismissed !== bar.text;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-linear-to-r from-gold-600 via-gold-500 to-gold-600 text-navy-900">
          <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 px-10 py-2 text-center text-sm font-medium sm:px-6">
            {bar!.link ? (
              <Link href={bar!.link} className="underline-offset-4 hover:underline">
                {bar!.text} →
              </Link>
            ) : (
              <span>{bar!.text}</span>
            )}
            <button
              aria-label="Dismiss announcement"
              className="absolute right-3 rounded px-1.5 text-navy-900/70 hover:bg-white/30 hover:text-navy-900"
              onClick={() => {
                setDismissed(bar!.text);
                try {
                  sessionStorage.setItem(DISMISS_KEY, bar!.text);
                } catch {}
              }}
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const LINKS = [
  { href: "/colleges", label: "Colleges" },
  { href: "/admissions", label: "Admissions" },
  { href: "/apply", label: "Apply" },
];

/**
 * `overlay` floats the header over a dark hero and turns it solid once the page scrolls.
 * `active` highlights the current section (passed in instead of reading the URL, so pages stay static).
 */
export function SiteHeader({ overlay = false, active }: { overlay?: boolean; active?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overlay || scrolled || open;

  return (
    <header
      className={cx(
        "top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-300",
        overlay ? "fixed" : "sticky",
        solid ? "border-b border-white/10 bg-navy-900/90 shadow-lg shadow-navy-900/20 backdrop-blur-md" : "border-b border-transparent bg-transparent",
      )}
    >
      <AnnouncementBar />
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <motion.span whileHover={{ rotate: -6, scale: 1.06 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="block">
            <Image src="/logo.png" alt="" width={40} height={40} className="rounded-lg bg-white p-0.5 shadow" priority />
          </motion.span>
          <span>
            <span className="block text-lg font-bold leading-tight text-white">CampusOne</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-gold-500">College Management Platform</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cx("relative rounded-lg px-3 py-2 transition-colors", active === l.href ? "text-white" : "text-navy-100 hover:text-white")}>
              {l.label}
              {active === l.href && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-gold-500" />}
            </Link>
          ))}
          <Link href="/login" className="relative ml-2 overflow-hidden rounded-lg bg-gold-500 px-4 py-2 font-semibold text-navy-900 transition hover:bg-gold-400">
            <span className="relative z-10">Sign in</span>
            <span className="absolute inset-y-0 left-0 w-1/3 animate-shine bg-white/40" aria-hidden />
          </Link>
        </nav>

        <button
          className="ml-auto flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg text-white hover:bg-white/10 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <motion.span animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} className="h-0.5 w-5 rounded bg-current" />
          <motion.span animate={{ opacity: open ? 0 : 1 }} className="h-0.5 w-5 rounded bg-current" />
          <motion.span animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} className="h-0.5 w-5 rounded bg-current" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/10 md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {[...LINKS, { href: "/login", label: "Sign in" }].map((l, i) => (
                <motion.div key={l.href} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cx("block rounded-lg px-3 py-3 text-base", l.href === "/login" ? "mt-2 bg-gold-500 text-center font-semibold text-navy-900" : "text-navy-100 hover:bg-white/10 hover:text-white")}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
