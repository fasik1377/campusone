import { HomePage } from "@/components/home";
import { PublicPage } from "@/components/site";

export default function Home() {
  return (
    <PublicPage overlay>
      <HomePage />
    </PublicPage>
    
  );
}
