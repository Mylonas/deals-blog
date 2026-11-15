import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = {
  title: "Φθηνότερα Πρατήρια Καυσίμων στην Κύπρο — Ζωντανές Τιμές",
  description:
    "Ζωντανές τιμές καυσίμων σε πρατήρια της Κύπρου. Φιλτράρετε κατά επαρχία και τύπο καυσίμου (Αμόλυβδη 95, 98, Πετρέλαιο) για να βρείτε το φθηνότερο κοντά σας. Τακτική ενημέρωση.",
  alternates: {"canonical":"/el/posts/cheapest-petrol-stations-cyprus/","languages":{"en":"/posts/cheapest-petrol-stations-cyprus/","el":"/el/posts/cheapest-petrol-stations-cyprus/","ru":"/ru/posts/cheapest-petrol-stations-cyprus/","x-default":"/posts/cheapest-petrol-stations-cyprus/"}},
};

export default function FuelPricesPageEL() {
  return (
    <ToolPage
      lang="el"
      tool="fuel"
      title="Φθηνότερα Πρατήρια Καυσίμων στην Κύπρο — Ζωντανές Τιμές"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Πύλη Τιμών Πετρελαιοειδών της Κυπριακής Κυβέρνησης", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<p>
        Φιλτράρετε κατά τύπο καυσίμου και επαρχία για να βρείτε το φθηνότερο πρατήριο κοντά σας.
        Τιμές από το{" "}
        <a
          href="https://petroleumprices.meci.gov.cy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300 hover:underline"
        >
          Παρατηρητήριο Τιμών Καυσίμων της Κυπριακής Κυβέρνησης
        </a>
        . Τακτική ενημέρωση.
      </p>}
    >
      <FuelTable data={data as any} lang="el" />
      <FuelChart history={(history as any).history} lang="el" />
      <FuelCompare data={data as any} lang="el" />

      
    </ToolPage>
  );
}
