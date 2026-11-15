import ToolPage from "@/components/ToolPage";
import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";

export const metadata = {
  title: "Παρακολούθηση Τιμών Σούπερ Μάρκετ — 10 Βασικά Προϊόντα",
  description:
    "Ζωντανές τιμές για 10 βασικά οικιακά προϊόντα σε όλα τα μεγάλα σούπερ μάρκετ της Κύπρου. Ενημερώνεται τακτικά από e-kalathi.gov.cy.",
  alternates: {"canonical":"/el/posts/supermarket-price-watch/","languages":{"en":"/posts/supermarket-price-watch/","el":"/el/posts/supermarket-price-watch/","ru":"/ru/posts/supermarket-price-watch/","x-default":"/posts/supermarket-price-watch/"}},
};

export default function SupermarketPriceWatchEL() {
  return (
    <ToolPage
      lang="el"
      tool="supermarket"
      title="Παρακολούθηση Τιμών Σούπερ Μάρκετ — 10 Βασικά Προϊόντα"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      details={<p>
        Ζωντανές τιμές για τα 10 πιο αγοραζόμενα οικιακά προϊόντα στην Κύπρο, από την κυβερνητική
        πλατφόρμα{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline">
          e-Kalathi
        </a>
        . Οι τιμές αντιστοιχούν στη φθηνότερη διαθέσιμη τιμή σε όλες τις αλυσίδες. Ενημερώνεται τακτικά.
      </p>}
    >
      <SupermarketTable items={data.items} lang="el" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-600 dark:text-gray-400">
        Πηγή δεδομένων:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Επίσημο παρατηρητήριο τιμών της Υπηρεσίας Προστασίας Καταναλωτή. Κάντε κλικ σε οποιαδήποτε τιμή για να δείτε όλα τα καταστήματα στο e-kalathi.
      </p>

      
    </ToolPage>
  );
}
