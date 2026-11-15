import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = {
  title: "Cheapest Souvlaki in Cyprus — Live Prices by City",
  description:
    "Souvlaki pita prices in Nicosia, Limassol, Larnaca, Paphos and Ayia Napa — pork, chicken, pork chop and mix, always sorted cheapest first. Updated every two days from Wolt, Bolt and Foody.",
  alternates: {"canonical":"/posts/cheapest-souvlaki-cyprus/","languages":{"en":"/posts/cheapest-souvlaki-cyprus/","el":"/el/posts/cheapest-souvlaki-cyprus/","ru":"/ru/posts/cheapest-souvlaki-cyprus/","x-default":"/posts/cheapest-souvlaki-cyprus/"}},
};

export default function CheapestSouvlakiEN() {
  return (
    <ToolPage
      lang="en"
      tool="souvlaki"
      title="Cheapest Souvlaki in Cyprus"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Souvlaki pita prices across Cyprus — pork souvlaki, chicken souvlaki, pork
        chop and mix — always sorted cheapest first. Pick your city, switch to the
        map view to see venues around you, or use the near-me button to sort by
        distance. Updated every two days from Wolt, Bolt and Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="en" />

      
    </ToolPage>
  );
}
