import JobsTable, { type JobsData } from "@/components/JobsTable";
import data from "@/data/public-jobs.json";
import Link from "next/link";

export const metadata = {
  title: "Κενές Θέσεις Δημοσίου Κύπρου — Ζωντανή Ενημέρωση",
  description:
    "Όλες οι ανοικτές θέσεις του δημόσιου τομέα στην Κύπρο σε ένα σημείο: Δημόσια Υπηρεσία (ΕΔΥ), ημικρατικοί οργανισμοί, οι πέντε Επαρχιακοί Οργανισμοί Αυτοδιοίκησης και οι 20 δήμοι.",
};

export default function PublicJobsEl() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Εργασία
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Κενές Θέσεις Δημοσίου Κύπρου</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Όλες οι ανοικτές θέσεις του δημόσιου τομέα, από 43 επίσημες πηγές: οι
        προκηρύξεις της Επιτροπής Δημόσιας Υπηρεσίας, οι ημικρατικοί οργανισμοί
        (Cyta, ΑΗΚ, Αρχή Λιμένων, ΟΚΥπΥ, τα πανεπιστήμια), οι πέντε Επαρχιακοί
        Οργανισμοί Αυτοδιοίκησης και οι 20 δήμοι. Οι προθεσμίες διαβάζονται
        απευθείας από τις προκηρύξεις. Τελευταία ενημέρωση{" "}
        {new Date(data.fetchedAt).toLocaleDateString("el-GR", {
          day: "numeric", month: "long", year: "numeric",
        })}.
      </p>

      <JobsTable data={data as unknown as JobsData} lang="el" />

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        Επίσημη πηγή παραμένει η Επίσημη Εφημερίδα της Δημοκρατίας, που εκδίδεται
        τις περισσότερες Παρασκευές. Ελέγχετε πάντα την επίσημη προκήρυξη πριν
        υποβάλετε αίτηση.
      </p>

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/el" className="text-sm text-blue-500 hover:underline">← Πίσω στις προσφορές</Link>
      </div>
    </article>
  );
}
