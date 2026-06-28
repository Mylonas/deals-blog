import FuelTable from "@/components/FuelTable";
import data from "@/data/fuel-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Cheapest Petrol Stations in Cyprus — Live Prices",
  description:
    "Live fuel prices across Cyprus. Filter by district and fuel type (Unleaded 95, 98, Diesel) to find the cheapest station near you. Updated hourly from the Cyprus government portal.",
};

export default function FuelPricesPage() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
          Fuel
        </span>
        <span className="text-xs font-semibold text-amber-600">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Cheapest Petrol Stations in Cyprus — Live Prices
      </h1>
      <p className="text-gray-500 mb-8">
        Filter by fuel type and district to find the cheapest station near you.
        Prices sourced hourly from the{" "}
        <a
          href="https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Cyprus Government Petroleum Prices portal
        </a>
        .
      </p>

      <FuelTable data={data as any} />

      <div className="mt-8">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to all deals
        </Link>
      </div>
    </article>
  );
}
