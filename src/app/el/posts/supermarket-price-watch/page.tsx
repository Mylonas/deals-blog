import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Παρακολούθηση Τιμών Σούπερ Μάρκετ — 10 Βασικά Προϊόντα",
  description:
    "Ζωντανές τιμές για 10 βασικά οικιακά προϊόντα σε όλα τα μεγάλα σούπερ μάρκετ της Κύπρου. Ενημερώνεται κάθε ώρα από e-kalathi.gov.cy.",
};

export default function SupermarketPriceWatchEL() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
          Φαγητό &amp; Ποτό
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Παρακολούθηση Τιμών Σούπερ Μάρκετ — 10 Βασικά Προϊόντα
      </h1>
      <p className="text-gray-500 mb-8">
        Ζωντανές τιμές για τα 10 πιο αγοραζόμενα οικιακά προϊόντα στην Κύπρο, από την κυβερνητική
        πλατφόρμα{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          e-Kalathi
        </a>
        . Οι τιμές αντιστοιχούν στη φθηνότερη διαθέσιμη τιμή σε όλες τις αλυσίδες. Ενημερώνεται κάθε ώρα.
      </p>

      <SupermarketTable items={data.items} lang="el" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-400">
        Πηγή δεδομένων:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Επίσημο παρατηρητήριο τιμών της Υπηρεσίας Προστασίας Καταναλωτή. Κάντε κλικ σε οποιαδήποτε τιμή για να δείτε όλα τα καταστήματα στο e-kalathi.
      </p>

      <div className="mt-8">
        <Link href="/el/" className="text-sm text-blue-500 hover:underline">
          ← Πίσω σε όλες τις προσφορές
        </Link>
      </div>
    </article>
  );
}
