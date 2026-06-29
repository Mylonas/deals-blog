import FuelTable from "@/components/FuelTable";
import data from "@/data/fuel-prices.json";
import Link from "next/link";

export const metadata = {
  title: "Дешевейшие АЗС на Кипре — Актуальные цены",
  description:
    "Актуальные цены на топливо на АЗС Кипра. Фильтруйте по округу и типу топлива (АИ-95, АИ-98, Дизель), чтобы найти ближайшую дешёвую заправку. Обновляется каждый час.",
};

export default function FuelPricesPageRU() {
  return (
    <article className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
          Топливо
        </span>
        <span className="text-xs font-semibold text-amber-600">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">
        Дешевейшие АЗС на Кипре — Актуальные цены
      </h1>
      <p className="text-gray-500 mb-8">
        Выберите тип топлива и округ, чтобы найти ближайшую дешёвую АЗС.
        Данные из{" "}
        <a
          href="https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          портала цен на топливо правительства Кипра
        </a>
        . Обновление каждый час.
      </p>

      <FuelTable data={data as any} lang="ru" />

      <div className="mt-8">
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">
          ← Назад ко всем предложениям
        </Link>
      </div>
    </article>
  );
}
