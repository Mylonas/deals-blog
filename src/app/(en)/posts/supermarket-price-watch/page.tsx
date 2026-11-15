import ToolPage from "@/components/ToolPage";
import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";

export const metadata = {
  title: "Cyprus Supermarket Price Watch — 10 Household Staples",
  description:
    "Live prices for 10 essential household products tracked across all major Cyprus supermarkets. Updated regularly from e-kalathi.gov.cy.",
  alternates: {"canonical":"/posts/supermarket-price-watch/","languages":{"en":"/posts/supermarket-price-watch/","el":"/el/posts/supermarket-price-watch/","ru":"/ru/posts/supermarket-price-watch/","x-default":"/posts/supermarket-price-watch/"}},
};

export default function SupermarketPriceWatchEN() {
  return (
    <ToolPage
      lang="en"
      tool="supermarket"
      title="Cyprus Supermarket Price Watch — 10 Household Staples"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      details={<p>
        Live prices for the 10 most-bought household products in Cyprus, sourced from the
        government&apos;s{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline">
          e-Kalathi
        </a>{" "}
        price comparison platform. Prices shown are the cheapest available across all
        participating supermarket chains. Updated regularly.
      </p>}
    >
      <SupermarketTable items={data.items} lang="en" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-600 dark:text-gray-400">
        Data source:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Cyprus Consumer Protection Service official price observatory. Click any price to see
        all store prices on e-kalathi.
      </p>

      
    </ToolPage>
  );
}
