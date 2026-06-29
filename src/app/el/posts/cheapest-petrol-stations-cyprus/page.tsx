import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";
import Link from "next/link";

export const metadata = {
  title: "Φθηνότερα Πρατήρια Καυσίμων στην Κύπρο — Ζωντανές Τιμές",
  description:
    "Ζωντανές τιμές καυσίμων σε πρατήρια της Κύπρου. Φιλτράρετε κατά επαρχία και τύπο καυσίμου (Αμόλυβδη 95, 98, Πετρέλαιο) για να βρείτε το φθηνότερο κοντά σας. Ενημέρωση κάθε ώρα.",
};

export default function FuelPricesPageEL() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Καύσιμα
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">ΖΩΝΤΑΝΑ ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Φθηνότερα Πρατήρια Καυσίμων στην Κύπρο — Ζωντανές Τιμές
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Φιλτράρετε κατά τύπο καυσίμου και επαρχία για να βρείτε το φθηνότερο πρατήριο κοντά σας.
        Τιμές από το{" "}
        <a
          href="https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Παρατηρητήριο Τιμών Καυσίμων της Κυπριακής Κυβέρνησης
        </a>
        . Ενημέρωση κάθε ώρα.
      </p>

      <FuelTable data={data as any} lang="el" />
      <FuelChart history={(history as any).history} lang="el" />

      <div className="mt-8">
        <Link href="/el/" className="text-sm text-blue-500 hover:underline">
          ← Πίσω σε όλες τις προσφορές
        </Link>
      </div>
    </article>
  );
}
