import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import { SHOW_FUEL_COMPARE } from "@/lib/features";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = {
  title: "Цены на Топливо Кипр Сегодня — Дешевейшие АЗС",
  description:
    "Цены на топливо на каждой АЗС Кипра. Сравните АИ-95, АИ-98 и Дизель по округам, чтобы найти ближайшую дешёвую заправку. Регулярное обновление из правительственного портала цен.",
  alternates: {"canonical":"/ru/fuel-prices-cyprus/","languages":{"en":"/fuel-prices-cyprus/","el":"/el/fuel-prices-cyprus/","ru":"/ru/fuel-prices-cyprus/","x-default":"/fuel-prices-cyprus/"}},
};

export default function FuelPricesPageRU() {
  return (
    <ToolPage
      lang="ru"
      tool="fuel"
      title="Цены на Топливо Кипр Сегодня"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Портал цен на нефтепродукты правительства Кипра", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<>
        <p>
          Сравните цены на бензин и дизельное топливо на каждой заправке Кипра.
          Фильтруйте по типу топлива (Бензин 95, 98, Дизель) и округу (Никосия,
          Лимассол, Ларнака, Пафос, Фамагуста), чтобы найти ближайшую дешёвую
          АЗС. Данные из{" "}
          <a
            href="https://petroleumprices.meci.gov.cy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 dark:text-blue-300 hover:underline"
          >
            портала цен на нефтепродукты правительства Кипра
          </a>{" "}
          и обновляются регулярно.
        </p>
      </>}
    >
      <FuelTable data={data as any} lang="ru" />
      <FuelChart history={(history as any).history} lang="ru" />
      {SHOW_FUEL_COMPARE && <FuelCompare data={data as any} lang="ru" />}


    </ToolPage>
  );
}
