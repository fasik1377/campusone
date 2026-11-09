"use client";

import Link from "next/link";
import { DEFAULT_SITE_CONTENT, formatPhone, phoneHref } from "@/lib/site-content";
import { useSite } from "./use-site";

export function FooterTagline() {
  const site = useSite();
  return <p className="mt-3 max-w-md text-sm text-navy-200">{site?.content.footerTagline ?? DEFAULT_SITE_CONTENT.footerTagline}</p>;
}

/** Platform support contacts from the Website content settings (defaults shown until they load). */
export function FooterContact() {
  const c = useSite()?.content ?? DEFAULT_SITE_CONTENT;
  return (
    <ul className="flex flex-col gap-2 text-navy-200">
      {c.contactPhone && (
        <li>
          📞{" "}
          <a className="transition hover:text-gold-400" href={phoneHref(c.contactPhone)}>
            {formatPhone(c.contactPhone)}
          </a>
        </li>
      )}
      {c.contactEmail && (
        <li>
          ✉️{" "}
          <a className="break-all transition hover:text-gold-400" href={`mailto:${c.contactEmail}`}>
            {c.contactEmail}
          </a>
        </li>
      )}
      {c.contactAddress && <li>📍 {c.contactAddress}</li>}
      <li>
        <Link href="/support" className="font-medium text-gold-400 hover:text-gold-500">
          Visit the help centre →
        </Link>
      </li>
    </ul>
  );
}
