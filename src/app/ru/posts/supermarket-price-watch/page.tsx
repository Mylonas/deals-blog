import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Мониторинг цен в супермаркетах — 10 основных продуктов",
  description:
    "Актуальные цены на 10 базовых товаров во всех крупных супермаркетах Кипра. Обновляется каждый час с e-kalathi.gov.cy.",
};

export default function SupermarketPriceWatchRU() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
          Еда и напитки
        </span>
        <span className="text-xs font-semibold text-amber-600">В РЕАЛЬНОМ ВРЕМЕНИ ●</span>
      </div>
      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Мониторинг цен в супермаркетах — 10 основных продуктов
      </h1>
      <p className="text-gray-500 mb-8">
        Актуальные цены на 10 самых покупаемых товаров на Кипре с официальной правительственной
        платформы{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          e-Kalathi
        </a>
        . Цены показывают минимальную стоимость среди всех участвующих сетей. Обновляется каждый час.
      </p>

      <SupermarketTable items={data.items} lang="ru" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-400">
        Источник данных:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Официальный портал цен Службы защиты потребителей Кипра. Нажмите на любую цену, чтобы увидеть все магазины на e-kalathi.
      </p>

      <div className="mt-8">
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">
          ← Назад ко всем предложениям
        </Link>
      </div>
    </article>
  );
}
