import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = {
  title: "Самый дешёвый Freddo Espresso на Кипре — Актуальные цены по городам",
  description:
    "Цены на Фреддо Эспрессо в Никосии, Лимасоле, Ларнаке, Пафосе и Айя-Напе — самые дешёвые кафе в каждом городе, всегда от самого дешёвого. Обновление раз в два дня через Wolt, Bolt Food и Foody.",
  alternates: {"canonical":"/ru/posts/cheapest-coffee-nicosia/","languages":{"en":"/posts/cheapest-coffee-nicosia/","el":"/el/posts/cheapest-coffee-nicosia/","ru":"/ru/posts/cheapest-coffee-nicosia/","x-default":"/posts/cheapest-coffee-nicosia/"}},
};

export default function CheapestFreddoRU() {
  return (
    <ToolPage
      lang="ru"
      tool="coffee"
      title="Самый дешёвый Freddo Espresso на Кипре"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Wolt, Bolt Food, Foody" }}
      details={<p>
        Цены на Фреддо Эспрессо по всему Кипру, всегда от самого дешёвого.
        Выберите город или нажмите «Рядом со мной», чтобы отсортировать по
        расстоянию. Обновление раз в два дня через Wolt, Bolt Food и Foody.
      </p>}
    >
      <FreddoTable data={data as any} lang="ru" />

      
    </ToolPage>
  );
}
