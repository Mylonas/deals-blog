import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Cheapest Freddo Espresso in Cyprus — Live Prices by City",
  description:
    "Freddo Espresso prices in Nicosia, Limassol, Larnaca, Paphos and Ayia Napa — the cheapest cafés in each city, always sorted cheapest first. Updated weekly from Wolt, Bolt Food and Foody.",
};

export default function CheapestFreddoEN() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Food &amp; Drink
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Cheapest Freddo Espresso in Cyprus
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Freddo Espresso prices across Cyprus, always sorted cheapest first. Pick
        your city, or use the near-me button to sort by distance. Updated weekly
        from Wolt, Bolt Food and Foody.
      </p>

      <FreddoTable data={data as any} lang="en" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/posts/cheapest-souvlaki-cyprus" className="text-sm text-blue-500 hover:underline">
          ← Cheapest souvlaki by city
        </Link>
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to all deals
        </Link>
      </div>
    </article>
  );
}
