"use client";

import { useCallback, useEffect, useState } from "react";

export class ClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData };

/** Calls the CampusOne API (`/api/v1/...`). Throws ClientError with the server's message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, { method, body, form }: Options = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: method ?? (body || form ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: form ?? (body ? JSON.stringify(body) : undefined),
    cache: "no-store",
  });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (res.status === 401 && !path.startsWith("/auth/login") && typeof window !== "undefined") {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new ClientError(data?.error ?? `Request failed (${res.status})`, res.status, data?.details);
  return data as T;
}

/** Loads an API path and exposes reload(). Pass null to skip loading. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}

/** Downloads a file (e.g. an Excel export) from the API, surfacing JSON errors. */
export async function download(path: string) {
  const res = await fetch(`/api/v1${path}`, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ClientError(data?.error ?? `Download failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "");
  saveBlob(blob, match?.[1] ?? "download");
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
}

export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const isoDate = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
