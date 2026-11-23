import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import { SHOW_FUEL_COMPARE } from "@/lib/features";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = pageMeta({ lang: "el", path: "fuel-prices-cyprus", ...PAGES.fuel.el });

export default function FuelPricesPageEL() {
  return (
    <ToolPage
      lang="el"
      tool="fuel"
      title="Τιμές Βενζίνης Κύπρος Σήμερα"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Παρατηρητήριο Τιμών Πετρελαιοειδών", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<>
        <p>
          Συγκρίνετε τιμές βενζίνης και πετρελαίου σε κάθε πρατήριο καυσίμων
          στην Κύπρο. Φιλτράρετε κατά τύπο καυσίμου (Αμόλυβδη 95, Αμόλυβδη 98,
          Πετρέλαιο Κίνησης) και επαρχία (Λευκωσία, Λεμεσός, Λάρνακα, Πάφος,
          Αμμόχωστος) για να βρείτε το φθηνότερο πρατήριο κοντά σας. Οι τιμές
          προέρχονται από το{" "}
          <a
            href="https://petroleumprices.meci.gov.cy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 dark:text-blue-300 hover:underline"
          >
            Παρατηρητήριο Τιμών Πετρελαιοειδών της Κυπριακής Κυβέρνησης
          </a>{" "}
          και ενημερώνονται τακτικά.
        </p>
      </>}
    >
      <FuelTable data={data as any} lang="el" />
      <FuelChart history={(history as any).history} lang="el" />
      {SHOW_FUEL_COMPARE && <FuelCompare data={data as any} lang="el" />}


    </ToolPage>
  );
}
