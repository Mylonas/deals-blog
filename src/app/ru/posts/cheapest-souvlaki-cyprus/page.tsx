import SouvlakiTable from "@/components/SouvlakiTable";
import data from "@/data/souvlaki-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Самый дешёвый сувлаки на Кипре — Актуальные цены по городам",
  description:
    "Цены на сувлаки в пите в Никосии, Лимасоле, Ларнаке, Пафосе и Айя-Напе — свинина, курица, отбивная и микс, всегда от самого дешёвого. Еженедельное обновление через Wolt.",
};

export default function CheapestSouvlakiRU() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Еда и напитки
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Самый дешёвый сувлаки на Кипре
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Цены на сувлаки в пите по всему Кипру — свинина, курица, свиная отбивная
        и микс — всегда от самого дешёвого. Выберите город или нажмите «Рядом со
        мной», чтобы отсортировать по расстоянию. Еженедельное обновление через Wolt.
      </p>

      <SouvlakiTable data={data as any} lang="ru" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/ru/posts/cheapest-coffee-nicosia" className="text-sm text-blue-500 hover:underline">
          ← Самый дешёвый Freddo Espresso по городам
        </Link>
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">
          ← Назад ко всем предложениям
        </Link>
      </div>
    </article>
  );
}
