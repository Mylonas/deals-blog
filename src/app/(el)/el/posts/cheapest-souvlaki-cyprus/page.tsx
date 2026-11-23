import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = pageMeta({ lang: "el", path: "posts/cheapest-souvlaki-cyprus", ...PAGES.souvlaki.el });

export default function CheapestSouvlakiEL() {
  return (
    <ToolPage
      lang="el"
      tool="souvlaki"
      title="Φθηνότερο Σουβλάκι στην Κύπρο"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Τιμές σουβλακιού σε πίτα σε όλη την Κύπρο — χοιρινό, κοτόπουλο, μπριζόλα
        και μιχτή — πάντα με το φθηνότερο πρώτο. Διαλέξτε πόλη, δείτε τα μαγαζιά
        γύρω σας στον χάρτη ή πατήστε «Κοντά μου» για ταξινόμηση με βάση την
        απόσταση. Ενημέρωση κάθε δύο ημέρες μέσω Wolt, Bolt και Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="el" />

      
    </ToolPage>
  );
}
