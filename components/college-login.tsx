"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "./icons";
import { Button, ErrorBox, Input } from "./ui";

type Me = { user: { name: string; username: string }; college: { name: string } | null };

/**
 * Sign-in card shown on a college's public page. Only accounts that belong to this college
 * (created by its administrators) can sign in here; each lands on the dashboard for their role.
 */
export function CollegeLoginCard({ slug, collegeName, accent }: { slug: string; collegeName: string; accent: string }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Plain fetch: a signed-out visitor is normal here and must not trigger the portal's 401 redirect.
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ home: string }>("/auth/login", { body: { identifier, password, college: slug } });
      router.replace(res.home);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div
      id="signin"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${accent}, #102a43)` }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">College portal</p>
        <h2 className="mt-1 text-xl font-bold">Sign in to {collegeName}</h2>
        <p className="mt-1 text-sm text-white/80">Staff and students: use the username and password given by your college administrator.</p>
      </div>
      <div className="p-6">
        {me === undefined ? (
          <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        ) : me ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              You are signed in as <b className="text-navy-900">{me.user.name}</b> (<span className="font-mono">{me.user.username}</span>).
            </p>
            <Link href="/portal" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white" style={{ backgroundColor: accent }}>
              Go to my dashboard <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <button
              className="text-sm text-slate-500 hover:text-navy-900"
              onClick={async () => {
                await fetch("/api/v1/auth/logout", { method: "POST" });
                setMe(null);
              }}
            >
              Sign in as someone else
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <ErrorBox message={error} />
            <Input label="Username" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            <div className="relative">
              <Input label="Password" type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-8 right-2 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100" aria-label={show ? "Hide password" : "Show password"}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <Button type="submit" loading={busy} className="w-full py-2.5">
              Sign in
            </Button>
            <p className="text-center text-xs text-slate-500">Forgot your password? Ask your college administrator to reset it. You can change it any time under My account.</p>
          </form>
        )}
      </div>
    </motion.div>
  );
}
