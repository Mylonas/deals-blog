import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = pageMeta({ lang: "ru", path: "posts/cheapest-supermarket-products", ...PAGES.supermarket.ru });

export default function CheapestSupermarketProductsRU() {
  return (
    <ToolPage
      lang="ru"
      tool="supermarket"
      title="Топ-20 лучших скидок в супермаркетах Кипра"
      updatedAt={(data as any).updatedAt}
      source={{ label: "e-kalathi.gov.cy", href: "https://www.e-kalathi.gov.cy" }}
      wide
      details={<p>Данные: e-Kalathi, государственный ценовой мониторинг. Указана текущая цена на полке; зачёркнутая сумма — прежняя цена. Нажмите на товар, чтобы сравнить цены во всех сетях. График показывает последние шесть месяцев.</p>}
    >
      <SupermarketDealsTable
        deals={(data as any).deals}
        allTimeLows={(data as any).allTimeLows ?? []}
        nearLows={(data as any).nearLows ?? []}
        lang="ru"
        updatedAt={(data as any).updatedAt}
      />
    </ToolPage>
  );
}
