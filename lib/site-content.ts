// Editable public-website content. Shared by the server (defaults) and the client (types).

export type Faq = { q: string; a: string };

export type SiteContent = {
  heroEyebrow: string;
  heroTitle: [string, string, string];
  heroSubtitle: string;
  rotatingWords: string[];
  featuredCollege: string | null; // college slug
  faqs: Faq[];
  ctaTitle: string;
  ctaText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  footerTagline: string;
  announcementBar: { enabled: boolean; text: string; link: string };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroEyebrow: "",
  heroTitle: ["One Portal.", "Multiple Colleges.", "One Connected Future."],
  heroSubtitle: "Every college runs independently and securely on one platform — built for",
  rotatingWords: ["admissions", "course registration", "grading", "attendance", "timetables", "student finance"],
  featuredCollege: null,
  faqs: [
    { q: "How do I apply to a college?", a: "Open the college directory, choose a college and program, then complete the online form and upload your transcript, certificates and ID. You will receive an application number to track your status." },
    { q: "How do I get my login?", a: "When your application is accepted, the registrar creates your student record and gives you a username and temporary password. You choose your own password at first sign-in." },
    { q: "Can colleges see each other's data?", a: "No. Every college's records are isolated. Staff can only see and change information that their role and college allow, and sensitive actions are recorded in an audit log." },
    { q: "When do students see their grades?", a: "Only after the instructor submits marks, the department approves them, and the registrar publishes them. Corrections after publication keep the previous values on record." },
    { q: "Does it work with Excel?", a: "Yes. Registrars can import students and export reports; instructors can download class lists and upload filled grade sheets, which are validated before saving." },
  ],
  ctaTitle: "Your next chapter starts here.",
  ctaText: "Apply to a college in minutes, or sign in to your portal to pick up where you left off.",
  contactEmail: "fasikabera1@gmail.com",
  contactPhone: "0964037658",
  contactAddress: "",
  footerTagline: "A unified digital platform for academic administration, student success, and institutional excellence.",
  announcementBar: { enabled: false, text: "", link: "" },
};

/** "0964037658" → "0964 037 658" for display. */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}

/** Tap-to-call link; local Ethiopian numbers (0XXXXXXXXX) get the +251 country code. */
export function phoneHref(phone: string) {
  const d = phone.replace(/[^\d+]/g, "");
  return `tel:${/^0\d{9}$/.test(d) ? `+251${d.slice(1)}` : d}`;
}
