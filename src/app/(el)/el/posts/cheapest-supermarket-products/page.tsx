import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = {
  title: "Top 20 Μεγαλύτερες Εκπτώσεις σε Σούπερ Μάρκετ Κύπρου",
  description:
    "Τα 20 προϊόντα με τις μεγαλύτερες μειώσεις τιμής επί του παρόντος σε όλα τα μεγάλα σούπερ μάρκετ της Κύπρου, από το επίσημο παρατηρητήριο τιμών e-Kalathi. Ενημέρωση καθημερινά.",
  alternates: {"canonical":"/el/posts/cheapest-supermarket-products/","languages":{"en":"/posts/cheapest-supermarket-products/","el":"/el/posts/cheapest-supermarket-products/","ru":"/ru/posts/cheapest-supermarket-products/","x-default":"/posts/cheapest-supermarket-products/"}},
};

export default function CheapestSupermarketProductsEL() {
  return (
    <ToolPage
      lang="el"
      tool="supermarket"
      title="Top 20 Μεγαλύτερες Εκπτώσεις σε Σούπερ Μάρκετ Κύπρου"
      updatedAt={(data as any).updatedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      wide
      details={<p>Δεδομένα: e-Kalathi, το κρατικό παρατηρητήριο τιμών. Οι τιμές είναι η τρέχουσα τιμή ραφιού· το διαγραμμένο ποσό είναι η προηγούμενη τιμή. Πατήστε σε ένα προϊόν για σύγκριση τιμών σε όλες τις αλυσίδες. Η τάση δείχνει τους τελευταίους έξι μήνες.</p>}
    >
      <SupermarketDealsTable
        deals={(data as any).deals}
        allTimeLows={(data as any).allTimeLows ?? []}
        nearLows={(data as any).nearLows ?? []}
        lang="el"
        updatedAt={(data as any).updatedAt}
      />
    </ToolPage>
  );
}
