import ToolPage from "@/components/ToolPage";
import FuelTable from "@/components/FuelTable";
import FuelChart from "@/components/FuelChart";
import FuelCompare from "@/components/FuelCompare";
import data from "@/data/fuel-prices.json";
import history from "@/data/fuel-price-history.json";

export const metadata = {
  title: "Дешевейшие АЗС на Кипре — Актуальные цены",
  description:
    "Актуальные цены на топливо на АЗС Кипра. Фильтруйте по округу и типу топлива (АИ-95, АИ-98, Дизель), чтобы найти ближайшую дешёвую заправку. Обновляется регулярно.",
  alternates: {"canonical":"/ru/posts/cheapest-petrol-stations-cyprus/","languages":{"en":"/posts/cheapest-petrol-stations-cyprus/","el":"/el/posts/cheapest-petrol-stations-cyprus/","ru":"/ru/posts/cheapest-petrol-stations-cyprus/","x-default":"/posts/cheapest-petrol-stations-cyprus/"}},
};

export default function FuelPricesPageRU() {
  return (
    <ToolPage
      lang="ru"
      tool="fuel"
      title="Дешевейшие АЗС на Кипре — Актуальные цены"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "Портал цен на нефтепродукты правительства Кипра", href: "https://petroleumprices.meci.gov.cy/" }}
      details={<p>
        Выберите тип топлива и округ, чтобы найти ближайшую дешёвую АЗС.
        Данные из{" "}
        <a
          href="https://petroleumprices.meci.gov.cy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300 hover:underline"
        >
          портала цен на топливо правительства Кипра
        </a>
        . Регулярное обновление.
      </p>}
    >
      <FuelTable data={data as any} lang="ru" />
      <FuelChart history={(history as any).history} lang="ru" />
      <FuelCompare data={data as any} lang="ru" />

      
    </ToolPage>
  );
}
