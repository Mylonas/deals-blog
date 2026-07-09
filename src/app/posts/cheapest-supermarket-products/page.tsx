import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";
import Link from "next/link";

export const metadata = {
  title: "Top 20 Biggest Supermarket Savings in Cyprus — Live Deals",
  description:
    "The 20 products with the biggest price cuts right now across all major Cyprus supermarkets, sourced from the government's e-Kalathi price observatory. Updated daily.",
};

export default function CheapestSupermarketProductsEN() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Food &amp; Drink
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Top 20 Biggest Supermarket Savings in Cyprus
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        The 20 products with the biggest price cuts available right now across all
        major Cyprus supermarkets, sourced from the government&apos;s{" "}
        <a
          href="https://www.e-kalathi.gov.cy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          e-Kalathi
        </a>{" "}
        price observatory. Click any product to compare prices across all chains.
        Updated daily.
      </p>

      <SupermarketDealsTable
        deals={(data as any).deals}
        allTimeLows={(data as any).allTimeLows ?? []}
        nearLows={(data as any).nearLows ?? []}
        lang="en"
        updatedAt={(data as any).updatedAt}
      />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/posts/supermarket-price-watch" className="text-sm text-blue-500 hover:underline">
          ← Price watch for 10 household staples
        </Link>
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to all deals
        </Link>
      </div>
    </article>
  );
}
