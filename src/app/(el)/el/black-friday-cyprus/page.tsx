import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import BlackFridayPage from "@/components/BlackFridayPage";

export const metadata = pageMeta({ lang: "el", path: "black-friday-cyprus", ...PAGES.blackFriday.el });

export default function Page() {
  return <BlackFridayPage lang="el" />;
}
