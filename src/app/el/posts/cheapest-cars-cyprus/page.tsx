import CarsTable, { type CarsData } from "@/components/CarsTable";
import data from "@/data/bazaraki-cars.json";
import Link from "next/link";

export const metadata = {
  title: "Φθηνότερα Αυτοκίνητα στην Κύπρο — Ζωντανές Αγγελίες Bazaraki",
  description:
    "Όλα τα αυτοκίνητα προς πώληση στο Bazaraki, ταξινομημένα από τα φθηνότερα. Φίλτρα ανά μάρκα, έτος, καύσιμο, κιβώτιο, τύπο αμαξώματος, πόλη, τιμή και χιλιόμετρα. Ημερήσια ενημέρωση.",
};

export default function CheapestCarsEL() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Οχήματα
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">ΖΩΝΤΑΝΑ ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Φθηνότερα Αυτοκίνητα στην Κύπρο</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Κάθε αυτοκίνητο που είναι αναρτημένο στο Bazaraki, με τα φθηνότερα πρώτα.
        Φίλτρα ανά μάρκα, έτος, καύσιμο, κιβώτιο, αμάξωμα, πόλη, τιμή και
        χιλιόμετρα. Τιμές και φωτογραφίες αντλούνται απευθείας από το
        bazaraki.com, με καθημερινή ενημέρωση.
      </p>

      <CarsTable data={data as unknown as CarsData} lang="el" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/el/" className="text-sm text-blue-500 hover:underline">← Πίσω σε όλες τις προσφορές</Link>
      </div>
    </article>
  );
}
