import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import { SHOW_FUEL_COMPARE } from "@/lib/features";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = {
  title: "Cheapest Petrol Stations in Cyprus",
  description:
    "Fuel prices across Cyprus. Filter by district and fuel type (Unleaded 95, 98, Diesel) to find the cheapest station near you. Updated regularly from the Cyprus government fuel observatory.",
  alternates: {"canonical":"/posts/cheapest-petrol-stations-cyprus/","languages":{"en":"/posts/cheapest-petrol-stations-cyprus/","el":"/el/posts/cheapest-petrol-stations-cyprus/","ru":"/ru/posts/cheapest-petrol-stations-cyprus/","x-default":"/posts/cheapest-petrol-stations-cyprus/"}},
};

export default function FuelPricesPage() {
  return (
    <ToolPage
      lang="en"
      tool="fuel"
      title="Cheapest Petrol Stations in Cyprus"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Cyprus Government Petroleum Prices portal", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<p>
        Filter by fuel type and district to find the cheapest station near you.
        Prices sourced from the{" "}
        <a
          href="https://petroleumprices.meci.gov.cy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300 hover:underline"
        >
          Cyprus Government Petroleum Prices portal
        </a>
        .
      </p>}
    >
      <FuelTable data={data as any} />
      <FuelChart history={(history as any).history} />
      {SHOW_FUEL_COMPARE && <FuelCompare data={data as any} />}

      
    </ToolPage>
  );
}
