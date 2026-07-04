import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";
import Link from "next/link";

export const metadata = {
  title: "Top 20 Μεγαλύτερες Εκπτώσεις σε Σούπερ Μάρκετ Κύπρου — Ζωντανές Προσφορές",
  description:
    "Τα 20 προϊόντα με τις μεγαλύτερες μειώσεις τιμής αυτή τη στιγμή σε όλα τα μεγάλα σούπερ μάρκετ της Κύπρου, από το επίσημο παρατηρητήριο τιμών e-Kalathi. Ενημέρωση καθημερινά.",
};

export default function CheapestSupermarketProductsEL() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Φαγητό &amp; Ποτό
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">ΖΩΝΤΑΝΑ ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Top 20 Μεγαλύτερες Εκπτώσεις σε Σούπερ Μάρκετ Κύπρου
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Τα 20 προϊόντα με τις μεγαλύτερες μειώσεις τιμής αυτή τη στιγμή σε όλα τα μεγάλα
        σούπερ μάρκετ της Κύπρου, από το{" "}
        <a
          href="https://www.e-kalathi.gov.cy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          e-Kalathi
        </a>{" "}
        — το επίσημο παρατηρητήριο τιμών της Κυπριακής Κυβέρνησης. Κάντε κλικ
        σε κάθε προϊόν για σύγκριση τιμών μεταξύ αλυσίδων. Ενημέρωση καθημερινά.
      </p>

      <SupermarketDealsTable
        deals={(data as any).deals}
        lang="el"
        updatedAt={(data as any).updatedAt}
      />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/el/posts/supermarket-price-watch" className="text-sm text-blue-500 hover:underline">
          ← Παρακολούθηση τιμών 10 βασικών προϊόντων
        </Link>
        <Link href="/el/" className="text-sm text-blue-500 hover:underline">
          ← Πίσω σε όλες τις προσφορές
        </Link>
      </div>
    </article>
  );
}
