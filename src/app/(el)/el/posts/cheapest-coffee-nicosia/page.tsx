import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = pageMeta({ lang: "el", path: "posts/cheapest-coffee-nicosia", ...PAGES.coffee.el });

export default function CheapestFreddoEL() {
  return (
    <ToolPage
      lang="el"
      tool="coffee"
      title="Φθηνότερο Freddo Espresso στην Κύπρο"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Τιμές Freddo Espresso σε όλη την Κύπρο, πάντα με το φθηνότερο πρώτο.
        Διαλέξτε πόλη ή πατήστε «Κοντά μου» για ταξινόμηση με βάση την απόσταση.
        Ενημέρωση κάθε δύο ημέρες μέσω Wolt, Bolt Food και Foody.
      </p>}
    >
      <FreddoTable data={data as any} lang="el" />

      
    </ToolPage>
  );
}
