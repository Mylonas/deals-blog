import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import BlackFridayPage from "@/components/BlackFridayPage";

export const metadata = pageMeta({ lang: "en", path: "black-friday-cyprus", ...PAGES.blackFriday.en });

export default function Page() {
  return <BlackFridayPage lang="en" />;
}
