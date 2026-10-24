import "server-only";
import { z } from "zod";
import { SiteSettings } from "./models";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "./site-content";

export async function loadSiteContent(): Promise<SiteContent> {
  const doc = await SiteSettings.findOne({ key: "site" }).lean();
  const saved = (doc?.content ?? {}) as Partial<SiteContent>;
  return {
    ...DEFAULT_SITE_CONTENT,
    ...saved,
    announcementBar: { ...DEFAULT_SITE_CONTENT.announcementBar, ...(saved.announcementBar ?? {}) },
  };
}

const line = (max: number) => z.string().trim().max(max);

export const siteContentSchema = z.object({
  heroEyebrow: line(80),
  heroTitle: z.tuple([line(40).min(1), line(40).min(1), line(40).min(1)]),
  heroSubtitle: line(240).min(1),
  rotatingWords: z.array(line(40).min(1)).min(1).max(12),
  featuredCollege: z.string().trim().max(80).nullable(),
  faqs: z.array(z.object({ q: line(200).min(1), a: line(1500).min(1) })).max(20),
  ctaTitle: line(80).min(1),
  ctaText: line(240),
  contactEmail: z.union([z.literal(""), z.email()]),
  contactPhone: line(40),
  contactAddress: line(200),
  footerTagline: line(240),
  announcementBar: z.object({
    enabled: z.boolean(),
    text: line(160),
    link: z.union([z.literal(""), z.string().trim().regex(/^(\/|https?:\/\/)/, "Link must start with / or http(s)://").max(300)]),
  }),
});
