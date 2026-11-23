import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = pageMeta({ lang: "en", path: "posts/cheapest-souvlaki-cyprus", ...PAGES.souvlaki.en });

export default function CheapestSouvlakiEN() {
  return (
    <ToolPage
      lang="en"
      tool="souvlaki"
      title="Cheapest Souvlaki in Cyprus"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Souvlaki pita prices across Cyprus — pork souvlaki, chicken souvlaki, pork
        chop and mix — always sorted cheapest first. Pick your city, switch to the
        map view to see venues around you, or use the near-me button to sort by
        distance. Updated every two days from Wolt, Bolt and Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="en" />

      
    </ToolPage>
  );
}
