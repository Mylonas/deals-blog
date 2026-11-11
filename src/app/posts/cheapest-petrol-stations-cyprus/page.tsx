import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";
import Link from "next/link";

export const metadata = {
  title: "Cheapest Petrol Stations in Cyprus — Live Prices",
  description:
    "Live fuel prices across Cyprus. Filter by district and fuel type (Unleaded 95, 98, Diesel) to find the cheapest station near you. Updated regularly from the Cyprus government fuel observatory.",
  alternates: {"canonical":"/posts/cheapest-petrol-stations-cyprus/","languages":{"en":"/posts/cheapest-petrol-stations-cyprus/","el":"/el/posts/cheapest-petrol-stations-cyprus/","ru":"/ru/posts/cheapest-petrol-stations-cyprus/","x-default":"/posts/cheapest-petrol-stations-cyprus/"}},
};

export default function FuelPricesPage() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Fuel
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Cheapest Petrol Stations in Cyprus — Live Prices
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Filter by fuel type and district to find the cheapest station near you.
        Prices sourced from the{" "}
        <a
          href="https://petroleumprices.meci.gov.cy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Cyprus Government Petroleum Prices portal
        </a>
        .
      </p>

      <FuelTable data={data as any} />
      <FuelChart history={(history as any).history} />
      <FuelCompare data={data as any} />

      <div className="mt-8">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to all deals
        </Link>
      </div>
    </article>
  );
}
