import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = pageMeta({ lang: "el", path: "posts/cheapest-supermarket-products", ...PAGES.supermarket.el });

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
