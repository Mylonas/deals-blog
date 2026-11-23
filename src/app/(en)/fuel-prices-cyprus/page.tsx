import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import { SHOW_FUEL_COMPARE } from "@/lib/features";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = pageMeta({ lang: "en", path: "fuel-prices-cyprus", ...PAGES.fuel.en });

export default function FuelPricesPage() {
  return (
    <ToolPage
      lang="en"
      tool="fuel"
      title="Petrol Prices in Cyprus Today"
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
