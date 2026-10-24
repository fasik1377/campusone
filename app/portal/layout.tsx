import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal-shell";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "Portal", robots: { index: false } };

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <Suspense fallback={<Loading label="Opening your portal…" />}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
