import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";
import Link from "next/link";

export const metadata = {
  title: "30 самых дешёвых продуктов в супермаркетах Кипра — Актуальные цены",
  description:
    "30 продуктов с минимальными ценами во всех крупных супермаркетах Кипра, по данным государственного ценового мониторинга e-Kalathi. Обновляется ежедневно.",
};

export default function CheapestSupermarketProductsRU() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Еда и напитки
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        30 самых дешёвых продуктов в супермаркетах Кипра
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Продукты с минимальными ценами во всех крупных супермаркетах Кипра,
        по данным государственного ценового портала{" "}
        <a
          href="https://www.e-kalathi.gov.cy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          e-Kalathi
        </a>
        . Нажмите на продукт, чтобы сравнить цены во всех магазинах.
        Обновляется ежедневно.
      </p>

      <SupermarketDealsTable
        deals={(data as any).deals}
        lang="ru"
        updatedAt={(data as any).updatedAt}
      />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/ru/posts/supermarket-price-watch" className="text-sm text-blue-500 hover:underline">
          ← Мониторинг цен на 10 базовых продуктов
        </Link>
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">
          ← Назад ко всем предложениям
        </Link>
      </div>
    </article>
  );
}
