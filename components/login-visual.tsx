"use client";

import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;
const LINES = ["One Portal.", "Multiple Colleges."];

/** Animated headline for the login side panel. */
export function LoginVisual() {
  return (
    <div className="relative">
      <motion.div
        className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-gold-500/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <p className="relative text-4xl font-bold leading-tight text-white">
        {LINES.map((line, i) => (
          <span key={line} className="block overflow-hidden">
            <motion.span className="block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease }}>
              {line}
            </motion.span>
          </span>
        ))}
        <span className="block overflow-hidden pb-1">
          <motion.span className="text-gold-gradient block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.34, ease }}>
            One Connected Future.
          </motion.span>
        </span>
      </p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="relative mt-4 max-w-md text-navy-100">
        Sign in to your role-specific portal — administration, registry, teaching, finance or student services.
      </motion.p>
    </div>
  );
}
