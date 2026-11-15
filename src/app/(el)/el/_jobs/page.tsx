import ToolPage from "@/components/ToolPage";
import JobsTable, { type JobsData } from "@/components/JobsTable";
import data from "@/data/public-jobs.json";

export const metadata = {
  title: "Κενές Θέσεις Δημοσίου Κύπρου — Ζωντανή Ενημέρωση",
  description:
    "Όλες οι ανοικτές θέσεις του δημόσιου τομέα στην Κύπρο σε ένα σημείο: Δημόσια Υπηρεσία (ΕΔΥ), ημικρατικοί οργανισμοί, δημόσια πανεπιστήμια και ερευνητικά κέντρα, οι πέντε Επαρχιακοί Οργανισμοί Αυτοδιοίκησης και οι 20 δήμοι — με φίλτρο ανά επαρχία.",
};

export default function PublicJobsEl() {
  return (
    <ToolPage
      lang="el"
      tool="jobs"
      title="Κενές Θέσεις Δημοσίου Κύπρου"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "62 επίσημες πηγές" }}
      wide
      details={<p>
        Όλες οι ανοικτές θέσεις του δημόσιου τομέα, από 62 επίσημες πηγές: οι
        προκηρύξεις της Επιτροπής Δημόσιας Υπηρεσίας, οι ημικρατικοί οργανισμοί
        (Cyta, ΑΗΚ, Αρχή Λιμένων, ΟΚΥπΥ, ΟΑΥ, οι ρυθμιστικές αρχές), τα δημόσια
        πανεπιστήμια, τα ερευνητικά κέντρα (Ινστιτούτο Νευρολογίας και Γενετικής,
        Ινστιτούτο Κύπρου, CYENS), οι πέντε Επαρχιακοί Οργανισμοί Αυτοδιοίκησης και
        οι 20 δήμοι. Φιλτράρετε ανά επαρχία για να δείτε μόνο ό,τι είναι ανοικτό
        κοντά σας. Οι προθεσμίες διαβάζονται απευθείας από τις προκηρύξεις.
        Τελευταία ενημέρωση{" "}
        {new Date(data.fetchedAt).toLocaleDateString("el-GR", {
          day: "numeric", month: "long", year: "numeric",
        })}.
      </p>}
    >
      <JobsTable data={data as unknown as JobsData} lang="el" />

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-8">
        Επίσημη πηγή παραμένει η Επίσημη Εφημερίδα της Δημοκρατίας, που εκδίδεται
        τις περισσότερες Παρασκευές. Ελέγχετε πάντα την επίσημη προκήρυξη πριν
        υποβάλετε αίτηση.
      </p>

      
    </ToolPage>
  );
}
