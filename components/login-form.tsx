"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, ErrorBox, Input } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api("/auth/login", { body: { identifier, password } });
      const next = params.get("next");
      // Only follow same-site portal paths to avoid open redirects.
      const target = res.mustChangePassword ? "/portal/account" : next && next.startsWith("/portal") ? next : "/portal";
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ErrorBox message={error} />
      <Input label="Username or email" required autoComplete="username" autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" loading={busy} className="w-full py-2.5">
        Sign in
      </Button>
    </form>
  );
}
