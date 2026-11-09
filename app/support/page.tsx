import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { PublicPage } from "@/components/site";
import { SupportCenter } from "@/components/support-center";

export const metadata: Metadata = { title: "Help & support", description: "Contact CampusOne support by phone or email, and find quick answers about sign-in, applications, grades and fees." };

export default function SupportPage() {
  return (
    <PublicPage active="/support">
      <PageHero eyebrow="Help centre" title="How can we help?" text="Call or email us, or find a quick answer below. Students and staff, applicants and colleges are all welcome." />
      <SupportCenter />
    </PublicPage>
  );
}
