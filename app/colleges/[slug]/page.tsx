import { Suspense } from "react";
import { CollegeProfile } from "@/components/college-profile";
import { PublicPage } from "@/components/site";
import { Loading } from "@/components/ui";

export default function CollegePage() {
  return (
    <PublicPage>
      <Suspense fallback={<Loading />}>
        <CollegeProfile />
      </Suspense>
    </PublicPage>
  );
}
