import ToolPage from "@/components/ToolPage";
import SupermarketDealsTable from "@/components/SupermarketDealsTable";
import data from "@/data/supermarket-deals.json";

export const metadata = {
  title: "Топ-20 лучших скидок в супермаркетах Кипра",
  description:
    "20 товаров с наибольшим снижением цены во всех крупных супермаркетах Кипра, по данным государственного ценового мониторинга e-Kalathi. Обновляется ежедневно.",
  alternates: {"canonical":"/ru/posts/cheapest-supermarket-products/","languages":{"en":"/posts/cheapest-supermarket-products/","el":"/el/posts/cheapest-supermarket-products/","ru":"/ru/posts/cheapest-supermarket-products/","x-default":"/posts/cheapest-supermarket-products/"}},
};

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
