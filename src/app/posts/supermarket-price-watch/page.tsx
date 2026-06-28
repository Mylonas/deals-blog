import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Cyprus Supermarket Price Watch — 10 Household Staples",
  description:
    "Live prices for 10 essential household products tracked across all major Cyprus supermarkets. Updated hourly from e-kalathi.gov.cy.",
};

export default function SupermarketPriceWatchEN() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
          Food &amp; Drink
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Cyprus Supermarket Price Watch — 10 Household Staples
      </h1>
      <p className="text-gray-500 mb-8">
        Live prices for the 10 most-bought household products in Cyprus, sourced from the
        government&apos;s{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          e-Kalathi
        </a>{" "}
        price comparison platform. Prices shown are the cheapest available across all
        participating supermarket chains. Updated hourly.
      </p>

      <SupermarketTable items={data.items} lang="en" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-400">
        Data source:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Cyprus Consumer Protection Service official price observatory. Click any price to see
        all store prices on e-kalathi.
      </p>

      <div className="mt-8">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to all deals
        </Link>
      </div>
    </article>
  );
}
