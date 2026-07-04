"use client";
import { useState, useMemo } from "react";

type Item = {
  key: string;
  label: string;
  labelEl: string;
  labelRu: string;
  price: number | null;
  productId: number | null;
  productName: string | null;
  brand?: string | null;
  store: string | null;
};

type Lang = "en" | "el" | "ru";
type SortKey = "label" | "price";

const T = {
  en: { staple: "Staple", price: "Cheapest Price", brand: "Brand", sortAZ: "A → Z", sortPrice: "Cheapest first", noBrand: "View on e-kalathi", na: "—" },
  el: { staple: "Προϊόν", price: "Φθηνότερη Τιμή", brand: "Μάρκα", sortAZ: "Α → Ω", sortPrice: "Φθηνότερα πρώτα", noBrand: "Δείτε στο e-kalathi", na: "—" },
  ru: { staple: "Продукт", price: "Мин. цена", brand: "Бренд", sortAZ: "А → Я", sortPrice: "Сначала дешевле", noBrand: "На e-kalathi", na: "—" },
};

export default function SupermarketTable({ items, lang, updatedAt }: { items: Item[]; lang: Lang; updatedAt: string }) {
  const [sort, setSort] = useState<SortKey>("label");
  const t = T[lang];

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sort === "price") {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      }
      const la = lang === "en" ? a.label : lang === "el" ? a.labelEl : a.labelRu;
      const lb = lang === "en" ? b.label : lang === "el" ? b.labelEl : b.labelRu;
      return la.localeCompare(lb);
    });
  }, [items, sort, lang]);

  const updated = new Date(updatedAt).toLocaleString(
    lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {lang === "en" ? "Sort by:" : lang === "el" ? "Ταξινόμηση:" : "Сортировка:"}
        </span>
        <button
          onClick={() => setSort("label")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sort === "label" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        >
          {t.sortAZ}
        </button>
        <button
          onClick={() => setSort("price")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sort === "price" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        >
          {t.sortPrice}
        </button>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {lang === "en" ? "Updated" : lang === "el" ? "Ενημέρωση" : "Обновлено"}: {updated}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
            <tr>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none"
                onClick={() => setSort("label")}
              >
                {t.staple} {sort === "label" && "↑"}
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none"
                onClick={() => setSort("price")}
              >
                {t.price} {sort === "price" && "↑"}
              </th>
              <th className="px-4 py-3 text-left">{t.brand}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((item) => {
              const label = lang === "en" ? item.label : lang === "el" ? item.labelEl : item.labelRu;
              const href = item.productId
                ? `https://www.e-kalathi.gov.cy/product-information/${item.productId}`
                : "https://www.e-kalathi.gov.cy";
              return (
                <tr key={item.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                  <td className="px-4 py-3">
                    {item.price !== null ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        €{item.price.toFixed(2)}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">{t.na}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {item.brand || item.productName ? (
                      <span title={item.productName ?? undefined}>{item.brand ?? item.productName}</span>
                    ) : item.productId ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline text-xs">
                        {t.noBrand} →
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">{t.na}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
