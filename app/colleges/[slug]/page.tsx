import { Suspense } from "react";
import { CollegeProfile } from "@/components/college-profile";
import { PublicPage } from "@/components/site";
import { Loading } from "@/components/ui";

export default function CollegePage() {
  return (
    <PublicPage overlay active="/colleges">
      <Suspense fallback={<div className="pt-24"><Loading /></div>}>
        <CollegeProfile />
      </Suspense>
    </PublicPage>
  );
}
