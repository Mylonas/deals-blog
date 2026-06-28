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
  store: string | null;
};

type Lang = "en" | "el" | "ru";
type SortKey = "label" | "price";

const T = {
  en: { staple: "Staple", price: "Cheapest Price", store: "Store", sortAZ: "A → Z", sortPrice: "Cheapest first", noStore: "View on e-kalathi", na: "—" },
  el: { staple: "Προϊόν", price: "Φθηνότερη Τιμή", store: "Κατάστημα", sortAZ: "Α → Ω", sortPrice: "Φθηνότερα πρώτα", noStore: "Δείτε στο e-kalathi", na: "—" },
  ru: { staple: "Продукт", price: "Мин. цена", store: "Магазин", sortAZ: "А → Я", sortPrice: "Сначала дешевле", noStore: "На e-kalathi", na: "—" },
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
        <span className="text-sm text-gray-500">
          {lang === "en" ? "Sort by:" : lang === "el" ? "Ταξινόμηση:" : "Сортировка:"}
        </span>
        <button
          onClick={() => setSort("label")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sort === "label" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          {t.sortAZ}
        </button>
        <button
          onClick={() => setSort("price")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sort === "price" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          {t.sortPrice}
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {lang === "en" ? "Updated" : lang === "el" ? "Ενημέρωση" : "Обновлено"}: {updated}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 select-none"
                onClick={() => setSort("label")}
              >
                {t.staple} {sort === "label" && "↑"}
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 select-none"
                onClick={() => setSort("price")}
              >
                {t.price} {sort === "price" && "↑"}
              </th>
              <th className="px-4 py-3 text-left">{t.store}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item) => {
              const label = lang === "en" ? item.label : lang === "el" ? item.labelEl : item.labelRu;
              const href = item.productId
                ? `https://www.e-kalathi.gov.cy/product-information/${item.productId}`
                : "https://www.e-kalathi.gov.cy";
              return (
                <tr key={item.key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{label}</td>
                  <td className="px-4 py-3">
                    {item.price !== null ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 hover:underline"
                      >
                        €{item.price.toFixed(2)}
                      </a>
                    ) : (
                      <span className="text-gray-400">{t.na}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.store ? (
                      item.store
                    ) : item.productId ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                        {t.noStore} →
                      </a>
                    ) : (
                      <span className="text-gray-400">{t.na}</span>
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
