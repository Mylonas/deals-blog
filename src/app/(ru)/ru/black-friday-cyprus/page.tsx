import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import BlackFridayPage from "@/components/BlackFridayPage";

export const metadata = pageMeta({ lang: "ru", path: "black-friday-cyprus", ...PAGES.blackFriday.ru });

export default function Page() {
  return <BlackFridayPage lang="ru" />;
}
