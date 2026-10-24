"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SiteContent } from "@/lib/site-content";

export type FeaturedCollege = { _id: string; name: string; code: string; slug: string; tagline?: string; address?: string; logoFileId?: string; coverImage?: string; brandColor?: string; programCount: number; admissionsOpen: boolean };
export type NewsItem = { _id: string; title: string; body: string; createdAt: string; college?: { name: string; slug: string } | null };
export type PublicSite = { content: SiteContent; featured: FeaturedCollege | null; news: NewsItem[] };

// One request per page load, shared by the header, footer and home page.
let pending: Promise<PublicSite> | null = null;

export function useSite() {
  const [site, setSite] = useState<PublicSite | null>(null);
  useEffect(() => {
    pending ??= api<PublicSite>("/public/site").catch((e) => {
      pending = null;
      throw e;
    });
    let alive = true;
    pending.then((s) => alive && setSite(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return site;
}
