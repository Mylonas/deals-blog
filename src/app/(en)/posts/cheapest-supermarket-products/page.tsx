import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = pageMeta({ lang: "en", path: "posts/cheapest-supermarket-products", ...PAGES.supermarket.en });

export default function CheapestSupermarketProductsEN() {
  return (
    <ToolPage
      lang="en"
      tool="supermarket"
      title="Top 20 Biggest Supermarket Savings in Cyprus"
      updatedAt={(data as any).updatedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      wide
      details={<p>Data: e-Kalathi, the government's price observatory. Prices are the current shelf price; the crossed-out amount is the previous price. Click any product to compare prices across all chains. The price trend shows the last six months.</p>}
    >
      <SupermarketDealsTable
        deals={(data as any).deals}
        allTimeLows={(data as any).allTimeLows ?? []}
        nearLows={(data as any).nearLows ?? []}
        lang="en"
        updatedAt={(data as any).updatedAt}
      />
    </ToolPage>
  );
}
