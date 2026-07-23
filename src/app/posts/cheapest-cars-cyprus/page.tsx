import CarsTable, { type CarsData } from "@/components/CarsTable";
import data from "@/data/bazaraki-cars.json";
import Link from "next/link";

export const metadata = {
  title: "Cheapest Cars in Cyprus — Live Bazaraki Listings",
  description:
    "Every car for sale on Bazaraki Cyprus, sorted cheapest first. Filter by make, year, fuel, gearbox, body type, city, price and mileage. Updated daily.",
};

export default function CheapestCarsEN() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Vehicles
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Cheapest Cars in Cyprus</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Every car listed on Bazaraki, cheapest first. Filter by make, year, fuel type,
        gearbox, body, city, price range and mileage. Prices and photos are pulled
        straight from bazaraki.com, refreshed once a day.
      </p>

      <CarsTable data={data as unknown as CarsData} lang="en" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/" className="text-sm text-blue-500 hover:underline">← Back to all deals</Link>
      </div>
    </article>
  );
}
