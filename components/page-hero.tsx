"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

/** Navy title band used at the top of inner public pages. */
export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-900">
      <div className="bg-grid absolute inset-0" />
      <motion.div
        className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-500">
          {eyebrow}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease }} className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </motion.h1>
        {text && (
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16, ease }} className="mt-3 max-w-2xl text-lg text-navy-100">
            {text}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  );
}
