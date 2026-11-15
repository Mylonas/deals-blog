import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = {
  title: "Самый дешёвый сувлаки на Кипре — Актуальные цены по городам",
  description:
    "Цены на сувлаки в пите в Никосии, Лимасоле, Ларнаке, Пафосе и Айя-Напе — свинина, курица, отбивная и микс, всегда от самого дешёвого. Еженедельное обновление через Wolt, Bolt и Foody.",
  alternates: {"canonical":"/ru/posts/cheapest-souvlaki-cyprus/","languages":{"en":"/posts/cheapest-souvlaki-cyprus/","el":"/el/posts/cheapest-souvlaki-cyprus/","ru":"/ru/posts/cheapest-souvlaki-cyprus/","x-default":"/posts/cheapest-souvlaki-cyprus/"}},
};

export default function CheapestSouvlakiRU() {
  return (
    <ToolPage
      lang="ru"
      tool="souvlaki"
      title="Самый дешёвый сувлаки на Кипре"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Цены на сувлаки в пите по всему Кипру — свинина, курица, свиная отбивная
        и микс — всегда от самого дешёвого. Выберите город, посмотрите заведения
        рядом с вами на карте или нажмите «Рядом со мной», чтобы отсортировать
        по расстоянию. Еженедельное обновление через Wolt, Bolt и Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="ru" />

      
    </ToolPage>
  );
}
