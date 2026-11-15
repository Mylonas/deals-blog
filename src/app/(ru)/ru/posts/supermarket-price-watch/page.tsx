import ToolPage from "@/components/ToolPage";
import SupermarketTable from "@/components/SupermarketTable";
import data from "@/data/supermarket-prices.json";

export const metadata = {
  title: "Мониторинг цен в супермаркетах — 10 основных продуктов",
  description:
    "Актуальные цены на 10 базовых товаров во всех крупных супермаркетах Кипра. Обновляется регулярно с e-kalathi.gov.cy.",
  alternates: {"canonical":"/ru/posts/supermarket-price-watch/","languages":{"en":"/posts/supermarket-price-watch/","el":"/el/posts/supermarket-price-watch/","ru":"/ru/posts/supermarket-price-watch/","x-default":"/posts/supermarket-price-watch/"}},
};

export default function SupermarketPriceWatchRU() {
  return (
    <ToolPage
      lang="ru"
      tool="supermarket"
      title="Мониторинг цен в супермаркетах — 10 основных продуктов"
      updatedAt={(data as any).updatedAt ?? (data as any).fetchedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      details={<p>
        Актуальные цены на 10 самых покупаемых товаров на Кипре с официальной правительственной
        платформы{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline">
          e-Kalathi
        </a>
        . Цены показывают минимальную стоимость среди всех участвующих сетей. Обновляется регулярно.
      </p>}
    >
      <SupermarketTable items={data.items} lang="ru" updatedAt={data.updatedAt} />

      <p className="mt-6 text-xs text-gray-600 dark:text-gray-400">
        Источник данных:{" "}
        <a href="https://www.e-kalathi.gov.cy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          e-kalathi.gov.cy
        </a>{" "}
        — Официальный портал цен Службы защиты потребителей Кипра. Нажмите на любую цену, чтобы увидеть все магазины на e-kalathi.
      </p>

      
    </ToolPage>
  );
}
