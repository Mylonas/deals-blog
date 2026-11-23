import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";

export const metadata = pageMeta({ lang: "ru", path: "posts/cheapest-souvlaki-cyprus", ...PAGES.souvlaki.ru });

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
        по расстоянию. Обновление раз в два дня через Wolt, Bolt и Foody.
      </p>}
    >
      <SouvlakiTable data={data as any} lang="ru" />

      
    </ToolPage>
  );
}
