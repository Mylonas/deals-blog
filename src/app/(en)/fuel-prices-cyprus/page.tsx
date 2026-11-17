import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import { SHOW_FUEL_COMPARE } from "@/lib/features";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = {
  title: "Cyprus Fuel Prices Today — Cheapest Petrol & Diesel Stations",
  description:
    "Live fuel prices at every petrol station in Cyprus. Compare Unleaded 95, Unleaded 98 and Diesel by district to find the cheapest station near you. Updated regularly from the official government fuel observatory.",
  alternates: {"canonical":"/fuel-prices-cyprus/","languages":{"en":"/fuel-prices-cyprus/","el":"/el/fuel-prices-cyprus/","ru":"/ru/fuel-prices-cyprus/","x-default":"/fuel-prices-cyprus/"}},
};

export default function FuelPricesPage() {
  return (
    <ToolPage
      lang="en"
      tool="fuel"
      title="Cyprus Fuel Prices Today"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Cyprus Government Petroleum Prices portal", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<>
        <p>
          Compare petrol and diesel prices at every fuel station across Cyprus.
          Filter by fuel type (Unleaded 95, Unleaded 98, Diesel) and district
          (Nicosia, Limassol, Larnaca, Paphos, Famagusta) to find the cheapest
          station near you. Prices are sourced from the{" "}
          <a
            href="https://petroleumprices.meci.gov.cy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 dark:text-blue-300 hover:underline"
          >
            official Cyprus government petroleum-prices observatory
          </a>{" "}
          and refreshed regularly.
        </p>
      </>}
    >
      <FuelTable data={data as any} />
      <FuelChart history={(history as any).history} />
      {SHOW_FUEL_COMPARE && <FuelCompare data={data as any} />}


    </ToolPage>
  );
}
