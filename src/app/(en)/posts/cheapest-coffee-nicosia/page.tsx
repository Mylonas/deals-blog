import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = pageMeta({ lang: "en", path: "posts/cheapest-coffee-nicosia", ...PAGES.coffee.en });

export default function CheapestFreddoEN() {
  return (
    <ToolPage
      lang="en"
      tool="coffee"
      title="Cheapest Freddo Espresso in Cyprus"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Freddo Espresso prices across Cyprus, always sorted cheapest first. Pick
        your city, or use the near-me button to sort by distance. Updated every two days
        from Wolt, Bolt Food and Foody.
      </p>}
    >
      <FreddoTable data={data as any} lang="en" />

      
    </ToolPage>
  );
}
