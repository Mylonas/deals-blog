"use client";
import { useState, useMemo } from "react";

type PricePoint = { d: string; p: number };

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
  history?: PricePoint[];
  lowSince?: string; // present on all-time-low deals: date the low first appeared
  atlPrice?: number; // present on near-low deals: the all-time-low price itself
  pctAboveLow?: number; // present on near-low deals: how far above the low, in %
};

type Lang = "en" | "el" | "ru";
type SortKey = "price" | "discount" | "name";
type Tab = "savings" | "lows";

const T = {
  en: {
    product: "Product", price: "Price", discount: "Discount", category: "Category",
    sortPrice: "Cheapest first", sortDiscount: "Biggest saving", sortName: "A → Z",
    updated: "Updated", onSale: "On sale", viewAll: "Compare prices →",
    trend: "6-month price trend",
    tabSavings: "Biggest savings", tabLows: "All-time lows",
    lowestEver: "Lowest ever", since: "since",
    nearLow: "Near lowest ever", aboveLow: "above the record low of",
    noLows: "No products are at or near an all-time low right now — check back soon.",
    lowsIntro: "Products whose price just dropped to the lowest level ever recorded on e-Kalathi (tracked since September 2025), plus products currently within 2% of their all-time low. The green % badge shows how far below the previous record a new low is; the amber badge shows how close a price is to its record.",
    note: "Prices from e-kalathi.gov.cy — the Cyprus government's official price observatory. Click any product to compare prices across all supermarket chains. The trend line shows the typical shelf price across chains, which may sit above the lowest price shown.",
  },
  el: {
    product: "Προϊόν", price: "Τιμή", discount: "Έκπτωση", category: "Κατηγορία",
    sortPrice: "Φθηνότερα πρώτα", sortDiscount: "Μεγαλύτερη έκπτωση", sortName: "Α → Ω",
    updated: "Ενημέρωση", onSale: "Σε προσφορά", viewAll: "Σύγκριση τιμών →",
    trend: "Τάση τιμής 6 μηνών",
    tabSavings: "Μεγαλύτερες εκπτώσεις", tabLows: "Ιστορικά χαμηλά",
    lowestEver: "Χαμηλότερη τιμή ποτέ", since: "από",
    nearLow: "Κοντά στο ιστορικό χαμηλό", aboveLow: "πάνω από το ρεκόρ των",
    noLows: "Κανένα προϊόν δεν βρίσκεται σε ή κοντά σε ιστορικό χαμηλό αυτή τη στιγμή — ελέγξτε ξανά σύντομα.",
    lowsIntro: "Προϊόντα των οποίων η τιμή μόλις έπεσε στο χαμηλότερο επίπεδο που έχει καταγραφεί ποτέ στο e-Kalathi (παρακολούθηση από Σεπτέμβριο 2025), μαζί με προϊόντα που βρίσκονται αυτή τη στιγμή έως 2% πάνω από το ιστορικό τους χαμηλό. Το πράσινο ποσοστό δείχνει πόσο κάτω από το προηγούμενο ρεκόρ είναι ένα νέο χαμηλό· το πορτοκαλί σήμα δείχνει πόσο κοντά στο ρεκόρ είναι η τιμή.",
    note: "Τιμές από το e-kalathi.gov.cy — το επίσημο παρατηρητήριο τιμών της Κυπριακής Κυβέρνησης. Κάντε κλικ σε κάθε προϊόν για να συγκρίνετε τιμές σε όλες τις αλυσίδες. Η γραμμή τάσης δείχνει την τυπική τιμή ραφιού μεταξύ αλυσίδων, που μπορεί να είναι πάνω από τη χαμηλότερη τιμή.",
  },
  ru: {
    product: "Продукт", price: "Цена", discount: "Скидка", category: "Категория",
    sortPrice: "Сначала дешевле", sortDiscount: "Наибольшая скидка", sortName: "А → Я",
    updated: "Обновлено", onSale: "Акция", viewAll: "Сравнить цены →",
    trend: "Динамика цены за 6 месяцев",
    tabSavings: "Лучшие скидки", tabLows: "Исторический минимум",
    lowestEver: "Минимум за всё время", since: "с",
    nearLow: "Близко к минимуму", aboveLow: "выше рекордных",
    noLows: "Сейчас ни один товар не находится на историческом минимуме или рядом с ним — загляните позже.",
    lowsIntro: "Товары, цена которых только что опустилась до самого низкого уровня за всю историю наблюдений e-Kalathi (с сентября 2025), а также товары, которые сейчас находятся в пределах 2% от своего исторического минимума. Зелёный процент показывает, насколько новая цена ниже предыдущего рекорда; янтарный значок — насколько цена близка к рекорду.",
    note: "Цены с e-kalathi.gov.cy — официального государственного ценового мониторинга Кипра. Нажмите на продукт, чтобы сравнить цены во всех супермаркетах. Линия тренда показывает типичную цену на полке по сетям, которая может быть выше минимальной.",
  },
};

function Sparkline({ history, label }: { history: PricePoint[]; label: string }) {
  const W = 220;
  const H = 36;
  const prices = history.map((h) => h.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pts = history.map((h, i) => {
    const x = (i / (history.length - 1)) * W;
    const y = H - 3 - ((h.p - min) / span) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-9 text-amber-500 dark:text-amber-400"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <polygon points={area} fill="currentColor" opacity={0.12} />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
        <span>{label}</span>
        <span>€{min.toFixed(2)} – €{max.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function SupermarketDealsTable({
  deals, allTimeLows = [], nearLows = [], lang, updatedAt,
}: { deals: Deal[]; allTimeLows?: Deal[]; nearLows?: Deal[]; lang: Lang; updatedAt: string }) {
  const [tab, setTab] = useState<Tab>("savings");
  const [sort, setSort] = useState<SortKey>("discount");
  const t = T[lang];

  // Fresh ATLs first, then near-lows (which carry discountPct 0, so the
  // default discount sort keeps that order)
  const active = tab === "savings" ? deals : [...allTimeLows, ...nearLows];

  const sorted = useMemo(() => {
    return [...active].sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "discount") return b.discountPct - a.discountPct;
      return a.name.localeCompare(b.name);
    });
  }, [active, sort]);

  const updated = new Date(updatedAt).toLocaleString(
    lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["savings", "lows"] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === k
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {k === "savings" ? t.tabSavings : t.tabLows}
          </button>
        ))}
      </div>

      {tab === "lows" && (
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t.lowsIntro}</p>
      )}

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

      {/* Empty state for the lows tab */}
      {tab === "lows" && sorted.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t.noLows}</p>
      )}

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
                {/* All-time-low badge */}
                {deal.lowSince && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    ⬇ {t.lowestEver} · {t.since}{" "}
                    {new Date(deal.lowSince).toLocaleDateString(
                      lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
                      { day: "numeric", month: "short" }
                    )}
                  </span>
                )}
                {/* Near-all-time-low badge */}
                {deal.pctAboveLow != null && deal.atlPrice != null && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    ≈ {t.nearLow} · +{deal.pctAboveLow}% {t.aboveLow} €{deal.atlPrice.toFixed(2)}
                  </span>
                )}
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
                {/* Price history sparkline */}
                {deal.history && deal.history.length >= 2 && (
                  <Sparkline history={deal.history} label={t.trend} />
                )}
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
