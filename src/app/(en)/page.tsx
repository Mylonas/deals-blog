import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import HomeHub from "@/components/HomeHub";
import { STR } from "@/lib/i18n";

export const metadata = pageMeta({ lang: "en", path: "", ...PAGES.home.en });

export default function Home() {
  return <HomeHub lang="en" />;
}
