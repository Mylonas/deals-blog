import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";

export const metadata = pageMeta({ lang: "ru", path: "posts/cheapest-coffee-nicosia", ...PAGES.coffee.ru });

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
