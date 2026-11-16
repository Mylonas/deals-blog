import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = {
  title: "Top 20 Biggest Supermarket Savings in Cyprus",
  description:
    "The 20 products with the biggest price cuts right now across all major Cyprus supermarkets, sourced from the government's e-Kalathi price observatory. Updated daily.",
  alternates: {"canonical":"/posts/cheapest-supermarket-products/","languages":{"en":"/posts/cheapest-supermarket-products/","el":"/el/posts/cheapest-supermarket-products/","ru":"/ru/posts/cheapest-supermarket-products/","x-default":"/posts/cheapest-supermarket-products/"}},
};

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
