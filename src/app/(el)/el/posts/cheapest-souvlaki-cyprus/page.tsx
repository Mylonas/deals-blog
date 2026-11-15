import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = {
  title: "Φθηνότερο Σουβλάκι στην Κύπρο — Ζωντανές Τιμές ανά Πόλη",
  description:
    "Τιμές σουβλακιού σε πίτα σε Λευκωσία, Λεμεσό, Λάρνακα, Πάφο και Αγία Νάπα — χοιρινό, κοτόπουλο, μπριζόλα και μιχτή, πάντα με το φθηνότερο πρώτο. Εβδομαδιαία ενημέρωση μέσω Wolt, Bolt και Foody.",
  alternates: {"canonical":"/el/posts/cheapest-souvlaki-cyprus/","languages":{"en":"/posts/cheapest-souvlaki-cyprus/","el":"/el/posts/cheapest-souvlaki-cyprus/","ru":"/ru/posts/cheapest-souvlaki-cyprus/","x-default":"/posts/cheapest-souvlaki-cyprus/"}},
};

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
        απόσταση. Εβδομαδιαία ενημέρωση μέσω Wolt, Bolt και Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="el" />

      
    </ToolPage>
  );
}
