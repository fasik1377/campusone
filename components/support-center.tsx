"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { DEFAULT_SITE_CONTENT, formatPhone, phoneHref } from "@/lib/site-content";
import { Icon, type IconName } from "./icons";
import { useSite } from "./use-site";
import { Button, cx, Input, inputClass, Select, Textarea } from "./ui";

const ease = [0.22, 1, 0.36, 1] as const;

const TOPICS: { id: string; icon: IconName; title: string; answer: string; link?: { href: string; label: string } }[] = [
  {
    id: "password",
    icon: "shield",
    title: "I forgot my password",
    answer: "Passwords are reset by your college. Ask your college administrator or registrar to set a new temporary password; you'll choose your own the next time you sign in.",
  },
  {
    id: "signin",
    icon: "admissions",
    title: "I can't sign in",
    answer: "Use the exact username your college gave you (or your email, if one is on your account). A college's own page only accepts that college's accounts. Check Caps Lock, and if it still fails, contact us below.",
    link: { href: "/colleges", label: "Find your college's sign-in" },
  },
  {
    id: "application",
    icon: "registration",
    title: "Where is my application?",
    answer: "Enter your application number and the email you applied with to see its current status and any message from admissions.",
    link: { href: "/admissions", label: "Track my application" },
  },
  {
    id: "grade",
    icon: "grades",
    title: "A grade looks wrong",
    answer: "Sign in, open Grades & transcript, and choose “Report a problem” next to the course. The registrar reviews it with your instructor and replies in the portal.",
    link: { href: "/login", label: "Sign in to appeal" },
  },
  {
    id: "fees",
    icon: "finance",
    title: "Fees and payments",
    answer: "Your invoices and balance are under Fees & payments in the portal. Payments are recorded by your college's finance office; bring your invoice number when you pay.",
  },
  {
    id: "join",
    icon: "building",
    title: "Bring my college to CampusOne",
    answer: "CampusOne runs admissions, registration, grading, attendance and fees for each college in its own secure space. Call or email us to set up your college.",
  },
];

const SUBJECTS = ["Sign-in or password", "Admissions / application", "Grades or courses", "Fees and payments", "Bring my college to CampusOne", "Something else"];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-lg px-2.5 py-1 text-xs font-medium text-navy-600 transition hover:bg-navy-50"
    >
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}

export function SupportCenter() {
  const c = useSite()?.content ?? DEFAULT_SITE_CONTENT;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });

  const topics = useMemo(() => TOPICS.filter((t) => `${t.title} ${t.answer}`.toLowerCase().includes(q.toLowerCase())), [q]);
  const mailto = `mailto:${c.contactEmail}?subject=${encodeURIComponent(`[CampusOne support] ${form.subject}`)}&body=${encodeURIComponent(
    `${form.message}\n\n— ${form.name || "(name)"}${form.email ? `\n${form.email}` : ""}`,
  )}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Contact cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[
          { icon: "📞", label: "Call us", value: formatPhone(c.contactPhone), raw: c.contactPhone, href: phoneHref(c.contactPhone), action: "Call now", note: "Tap to call from your phone" },
          { icon: "✉️", label: "Email us", value: c.contactEmail, raw: c.contactEmail, href: `mailto:${c.contactEmail}`, action: "Send an email", note: "We reply by email" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-navy-900/5"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold-500/10" aria-hidden />
            <div className="relative flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-2xl" aria-hidden>
                {card.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-0.5 text-2xl font-bold break-all text-navy-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{card.note}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a href={card.href} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-gold-400">
                    {card.action} <Icon name="arrow" className="h-4 w-4" />
                  </a>
                  <CopyButton text={card.raw} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Help topics */}
        <section aria-labelledby="topics">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="topics" className="text-2xl font-bold text-navy-900">
              Quick answers
            </h2>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help…" aria-label="Search help topics" className={cx(inputClass, "max-w-xs")} />
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {topics.map((t) => (
              <li key={t.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors", open === t.id ? "bg-gold-500 text-navy-900" : "bg-navy-50 text-navy-700")}>
                    <Icon name={t.icon} className="h-5 w-5" />
                  </span>
                  <span className="flex-1 font-semibold text-navy-900">{t.title}</span>
                  <span className={cx("text-slate-400 transition-transform", open === t.id && "rotate-45")}>
                    <Icon name="plus" className="h-4 w-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === t.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }}>
                      <div className="px-5 pb-5 pl-[4.75rem] text-sm text-slate-600">
                        <p>{t.answer}</p>
                        {t.link && (
                          <Link href={t.link.href} className="mt-2 inline-flex items-center gap-1 font-semibold text-navy-600 hover:underline">
                            {t.link.label} <Icon name="arrow" className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
            {!topics.length && <li className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No topic matches — send us a message instead.</li>}
          </ul>
        </section>

        {/* Message form */}
        <section aria-labelledby="write" className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 id="write" className="text-2xl font-bold text-navy-900">
            Send us a message
          </h2>
          <p className="mt-1 text-sm text-slate-500">This opens your email app with your message ready to send to {c.contactEmail}.</p>
          <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = mailto;
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Your email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <Select label="Topic" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
            <Textarea label="How can we help?" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} hint="Include your college, username or application number if you have one — never your password." />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" className="py-2.5" disabled={!form.name.trim() || !form.message.trim()}>
                Write email
              </Button>
              <span className="text-xs text-slate-500">
                or call{" "}
                <a href={phoneHref(c.contactPhone)} className="font-semibold text-navy-600 hover:underline">
                  {formatPhone(c.contactPhone)}
                </a>
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
