import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Φθηνότερο Freddo Espresso στην Κύπρο — Ζωντανές Τιμές ανά Πόλη",
  description:
    "Τιμές Freddo Espresso σε Λευκωσία, Λεμεσό, Λάρνακα, Πάφο και Αγία Νάπα — οι φθηνότερες καφετέριες σε κάθε πόλη, πάντα με το φθηνότερο πρώτο. Εβδομαδιαία ενημέρωση μέσω Wolt.",
};

export default function CheapestFreddoEL() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Φαγητό &amp; Ποτό
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">ΖΩΝΤΑΝΑ ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Φθηνότερο Freddo Espresso στην Κύπρο
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Τιμές Freddo Espresso σε όλη την Κύπρο, πάντα με το φθηνότερο πρώτο.
        Διαλέξτε πόλη ή πατήστε «Κοντά μου» για ταξινόμηση με βάση την απόσταση.
        Εβδομαδιαία ενημέρωση μέσω Wolt.
      </p>

      <FreddoTable data={data as any} lang="el" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/el/posts/cheapest-souvlaki-cyprus" className="text-sm text-blue-500 hover:underline">
          ← Φθηνότερο σουβλάκι ανά πόλη
        </Link>
        <Link href="/el/" className="text-sm text-blue-500 hover:underline">
          ← Πίσω σε όλες τις προσφορές
        </Link>
      </div>
    </article>
  );
}
