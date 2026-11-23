import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import HomeHub from "@/components/HomeHub";
import { STR } from "@/lib/i18n";

export const metadata = pageMeta({ lang: "ru", path: "", ...PAGES.home.ru });

export default function Home() {
  return <HomeHub lang="ru" />;
}
