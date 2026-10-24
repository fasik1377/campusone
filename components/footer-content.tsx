"use client";

import { DEFAULT_SITE_CONTENT } from "@/lib/site-content";
import { useSite } from "./use-site";

export function FooterTagline() {
  const site = useSite();
  return <p className="mt-3 max-w-md text-sm text-navy-200">{site?.content.footerTagline ?? DEFAULT_SITE_CONTENT.footerTagline}</p>;
}

/** Platform contact details from the Website content settings; falls back to general guidance. */
export function FooterContact() {
  const c = useSite()?.content;
  if (!c || (!c.contactEmail && !c.contactPhone && !c.contactAddress)) {
    return <p className="text-navy-200">For academic questions, contact your college registrar. For account access, contact your college administrator.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-navy-200">
      {c.contactAddress && <li>📍 {c.contactAddress}</li>}
      {c.contactPhone && (
        <li>
          📞 <a className="transition hover:text-gold-400" href={`tel:${c.contactPhone.replace(/\s+/g, "")}`}>{c.contactPhone}</a>
        </li>
      )}
      {c.contactEmail && (
        <li>
          ✉️ <a className="transition hover:text-gold-400" href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>
        </li>
      )}
    </ul>
  );
}
