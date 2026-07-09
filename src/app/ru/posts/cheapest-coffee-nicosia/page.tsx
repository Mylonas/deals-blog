import FreddoTable from "@/components/FreddoTable";
import data from "@/data/coffee-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Самый дешёвый Freddo Espresso на Кипре — Актуальные цены по городам",
  description:
    "Цены на Фреддо Эспрессо в Никосии, Лимасоле, Ларнаке, Пафосе и Айя-Напе — самые дешёвые кафе в каждом городе, всегда от самого дешёвого. Еженедельное обновление через Wolt, Bolt Food и Foody.",
};

export default function CheapestFreddoRU() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Еда и напитки
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Самый дешёвый Freddo Espresso на Кипре
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Цены на Фреддо Эспрессо по всему Кипру, всегда от самого дешёвого.
        Выберите город или нажмите «Рядом со мной», чтобы отсортировать по
        расстоянию. Еженедельное обновление через Wolt, Bolt Food и Foody.
      </p>

      <FreddoTable data={data as any} lang="ru" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/ru/posts/cheapest-souvlaki-cyprus" className="text-sm text-blue-500 hover:underline">
          ← Самый дешёвый сувлаки по городам
        </Link>
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">
          ← Назад ко всем предложениям
        </Link>
      </div>
    </article>
  );
}
