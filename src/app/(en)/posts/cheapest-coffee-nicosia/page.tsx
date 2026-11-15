import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = {
  title: "Cheapest Freddo Espresso in Cyprus — Live Prices by City",
  description:
    "Freddo Espresso prices in Nicosia, Limassol, Larnaca, Paphos and Ayia Napa — the cheapest cafés in each city, always sorted cheapest first. Updated every two days from Wolt, Bolt Food and Foody.",
  alternates: {"canonical":"/posts/cheapest-coffee-nicosia/","languages":{"en":"/posts/cheapest-coffee-nicosia/","el":"/el/posts/cheapest-coffee-nicosia/","ru":"/ru/posts/cheapest-coffee-nicosia/","x-default":"/posts/cheapest-coffee-nicosia/"}},
};

export default function CheapestFreddoEN() {
  return (
    <ToolPage
      lang="en"
      tool="coffee"
      title="Cheapest Freddo Espresso in Cyprus"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Freddo Espresso prices across Cyprus, always sorted cheapest first. Pick
        your city, or use the near-me button to sort by distance. Updated every two days
        from Wolt, Bolt Food and Foody.
      </p>}
    >
      <FreddoTable data={data as any} lang="en" />

      
    </ToolPage>
  );
}
