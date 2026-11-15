import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = {
  title: "Φθηνότερο Freddo Espresso στην Κύπρο — Ζωντανές Τιμές ανά Πόλη",
  description:
    "Τιμές Freddo Espresso σε Λευκωσία, Λεμεσό, Λάρνακα, Πάφο και Αγία Νάπα — οι φθηνότερες καφετέριες σε κάθε πόλη, πάντα με το φθηνότερο πρώτο. Ενημέρωση κάθε δύο ημέρες μέσω Wolt, Bolt Food και Foody.",
  alternates: {"canonical":"/el/posts/cheapest-coffee-nicosia/","languages":{"en":"/posts/cheapest-coffee-nicosia/","el":"/el/posts/cheapest-coffee-nicosia/","ru":"/ru/posts/cheapest-coffee-nicosia/","x-default":"/posts/cheapest-coffee-nicosia/"}},
};

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
