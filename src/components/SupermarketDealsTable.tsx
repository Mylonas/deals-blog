"use client";
import { useState, useMemo } from "react";

type Deal = {
  productMasterId: number;
  name: string;
  price: number;
  previousPrice: number | null;
  discountPct: number;
  category: string;
  categoryEl: string;
  categoryRu: string;
  thumbnailUrl: string | null;
  eKalathiUrl: string;
  availableAtChains: number | null;
};

type Lang = "en" | "el" | "ru";
type SortKey = "price" | "discount" | "name";

const T = {
  en: {
    product: "Product", price: "Price", discount: "Discount", category: "Category",
    sortPrice: "Cheapest first", sortDiscount: "Biggest saving", sortName: "A → Z",
    updated: "Updated", onSale: "On sale", viewAll: "Compare prices →",
    note: "Prices from e-kalathi.gov.cy — the Cyprus government's official price observatory. Click any product to compare prices across all supermarket chains.",
  },
  el: {
    product: "Προϊόν", price: "Τιμή", discount: "Έκπτωση", category: "Κατηγορία",
    sortPrice: "Φθηνότερα πρώτα", sortDiscount: "Μεγαλύτερη έκπτωση", sortName: "Α → Ω",
    updated: "Ενημέρωση", onSale: "Σε προσφορά", viewAll: "Σύγκριση τιμών →",
    note: "Τιμές από το e-kalathi.gov.cy — το επίσημο παρατηρητήριο τιμών της Κυπριακής Κυβέρνησης. Κάντε κλικ σε κάθε προϊόν για να συγκρίνετε τιμές σε όλες τις αλυσίδες.",
  },
  ru: {
    product: "Продукт", price: "Цена", discount: "Скидка", category: "Категория",
    sortPrice: "Сначала дешевле", sortDiscount: "Наибольшая скидка", sortName: "А → Я",
    updated: "Обновлено", onSale: "Акция", viewAll: "Сравнить цены →",
    note: "Цены с e-kalathi.gov.cy — официального государственного ценового мониторинга Кипра. Нажмите на продукт, чтобы сравнить цены во всех супермаркетах.",
  },
};

export default function SupermarketDealsTable({
  deals, lang, updatedAt,
}: { deals: Deal[]; lang: Lang; updatedAt: string }) {
  const [sort, setSort] = useState<SortKey>("discount");
  const t = T[lang];

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "discount") return b.discountPct - a.discountPct;
      return a.name.localeCompare(b.name);
    });
  }, [deals, sort]);

  const updated = new Date(updatedAt).toLocaleString(
    lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">
          {lang === "en" ? "Sort:" : lang === "el" ? "Ταξινόμηση:" : "Сортировка:"}
        </span>
        {(["price", "discount", "name"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              sort === key
                ? "bg-amber-500 text-white border-amber-500"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {key === "price" ? t.sortPrice : key === "discount" ? t.sortDiscount : t.sortName}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {t.updated}: {updated}
        </span>
      </div>

      {/* Product cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((deal) => {
          const cat = lang === "en" ? deal.category : lang === "el" ? deal.categoryEl : deal.categoryRu;
          return (
            <a
              key={deal.productMasterId}
              href={deal.eKalathiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all group bg-white dark:bg-gray-900"
            >
              {/* Thumbnail */}
              {deal.thumbnailUrl && (
                <img
                  src={deal.thumbnailUrl}
                  alt={deal.name}
                  width={48}
                  height={48}
                  className="rounded-lg object-contain flex-shrink-0 bg-gray-50 dark:bg-gray-800"
                  loading="lazy"
                />
              )}

              <div className="flex-1 min-w-0">
                {/* Category */}
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {cat}
                </span>
                {/* Name */}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mt-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {deal.name}
                </p>
                {/* Price row */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    €{deal.price.toFixed(2)}
                  </span>
                  {deal.previousPrice && deal.discountPct > 0 && (
                    <>
                      <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                        €{deal.previousPrice.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        -{deal.discountPct}%
                      </span>
                    </>
                  )}
                  <span className="ml-auto text-xs text-blue-500 dark:text-blue-400 group-hover:underline whitespace-nowrap">
                    {t.viewAll}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Note */}
      <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
        {t.note}
      </p>
    </div>
  );
}
