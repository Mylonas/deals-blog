"use client";
import { useMemo, useState } from "react";

type Lang = "en" | "el" | "ru";

export type Car = {
  id: number;
  title: string | null;
  make: string | null;
  model: string | null;
  price: number;
  currency: string;
  year: number | null;
  mileage: number | null;
  fuel: string | null;
  gearbox: string | null;
  body: string | null;
  drive: string | null;
  doors: string | null;
  colour: string | null;
  engine: string | null;
  engineL: number | null;
  city: string | null;
  image: string | null;
  link: string;
  postedTs: number | null;
};

export type CarsData = { updatedAt: string; source: string; count: number; cars: Car[] };

type SortKey = "price" | "year" | "mileage";

const T: Record<Lang, Record<string, string>> = {
  en: {
    total: "cars", search: "Search make or model…", any: "Any",
    make: "Make", city: "City", fuel: "Fuel", gearbox: "Gearbox", body: "Body",
    yearMin: "Year from", yearMax: "Year to",
    priceMin: "Min €", priceMax: "Max €", mileageMax: "Max km",
    sortPrice: "Cheapest first", sortPriceDesc: "Most expensive",
    sortYear: "Newest first", sortYearOld: "Oldest first",
    sortKm: "Lowest km", clear: "Clear filters",
    photo: "Photo", car: "Car", year: "Year", km: "Kilometres", price: "Price", loc: "Location",
    view: "View →", none: "No cars match your filters.", showing: "Showing", of: "of", updated: "Updated",
    diesel: "Diesel", petrol: "Petrol", hybrid: "Hybrid", electric: "Electric", automatic: "Auto", manual: "Manual",
  },
  el: {
    total: "αυτοκίνητα", search: "Μάρκα ή μοντέλο…", any: "Όλα",
    make: "Μάρκα", city: "Πόλη", fuel: "Καύσιμο", gearbox: "Κιβώτιο", body: "Αμάξωμα",
    yearMin: "Έτος από", yearMax: "Έτος έως",
    priceMin: "Ελάχ. €", priceMax: "Μέγ. €", mileageMax: "Μέγ. km",
    sortPrice: "Φθηνότερα πρώτα", sortPriceDesc: "Ακριβότερα πρώτα",
    sortYear: "Νεότερα πρώτα", sortYearOld: "Παλαιότερα πρώτα",
    sortKm: "Λιγότερα km", clear: "Καθαρισμός",
    photo: "Φωτ.", car: "Αυτοκίνητο", year: "Έτος", km: "Χιλιόμετρα", price: "Τιμή", loc: "Περιοχή",
    view: "Δείτε →", none: "Καμία αγγελία με αυτά τα κριτήρια.", showing: "Εμφάνιση", of: "από", updated: "Ενημέρωση",
    diesel: "Ντίζελ", petrol: "Βενζίνη", hybrid: "Υβριδικό", electric: "Ηλεκτρικό", automatic: "Αυτόμ.", manual: "Χειροκίν.",
  },
  ru: {
    total: "авто", search: "Марка или модель…", any: "Любое",
    make: "Марка", city: "Город", fuel: "Топливо", gearbox: "Коробка", body: "Кузов",
    yearMin: "Год от", yearMax: "Год до",
    priceMin: "Мин €", priceMax: "Макс €", mileageMax: "Макс км",
    sortPrice: "Сначала дешевле", sortPriceDesc: "Сначала дороже",
    sortYear: "Сначала новее", sortYearOld: "Сначала старее",
    sortKm: "Меньше км", clear: "Сбросить",
    photo: "Фото", car: "Авто", year: "Год", km: "Километры", price: "Цена", loc: "Город",
    view: "Смотреть →", none: "Нет авто по этим фильтрам.", showing: "Показано", of: "из", updated: "Обновлено",
    diesel: "Дизель", petrol: "Бензин", hybrid: "Гибрид", electric: "Электро", automatic: "Авто", manual: "Механика",
  },
};

const PAGE_SIZE = 40;

function numFmt(n: number) {
  return n.toLocaleString("en-US").replace(/,/g, ".");
}

function uniqueSorted<T>(items: T[], key: (v: T) => string | null): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const v = key(it);
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export default function CarsTable({ data, lang }: { data: CarsData; lang: Lang }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [make, setMake] = useState("");
  const [city, setCity] = useState("");
  const [fuel, setFuel] = useState("");
  const [gearbox, setGearbox] = useState("");
  const [body, setBody] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [mileageMax, setMileageMax] = useState("");
  const [sort, setSort] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const makes = useMemo(() => uniqueSorted(data.cars, (c) => c.make), [data.cars]);
  const cities = useMemo(() => uniqueSorted(data.cars, (c) => c.city), [data.cars]);
  const fuels = useMemo(() => uniqueSorted(data.cars, (c) => c.fuel), [data.cars]);
  const gearboxes = useMemo(() => uniqueSorted(data.cars, (c) => c.gearbox), [data.cars]);
  const bodies = useMemo(() => uniqueSorted(data.cars, (c) => c.body), [data.cars]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const ymin = yearMin ? Number(yearMin) : null;
    const ymax = yearMax ? Number(yearMax) : null;
    const pmin = priceMin ? Number(priceMin) : null;
    const pmax = priceMax ? Number(priceMax) : null;
    const kmax = mileageMax ? Number(mileageMax) : null;
    const out: Car[] = [];
    for (const c of data.cars) {
      if (make && c.make !== make) continue;
      if (city && c.city !== city) continue;
      if (fuel && c.fuel !== fuel) continue;
      if (gearbox && c.gearbox !== gearbox) continue;
      if (body && c.body !== body) continue;
      if (ymin != null && (c.year == null || c.year < ymin)) continue;
      if (ymax != null && (c.year == null || c.year > ymax)) continue;
      if (pmin != null && c.price < pmin) continue;
      if (pmax != null && c.price > pmax) continue;
      if (kmax != null && (c.mileage == null || c.mileage > kmax)) continue;
      if (qLower) {
        const hay = `${c.make ?? ""} ${c.model ?? ""} ${c.title ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) continue;
      }
      out.push(c);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = a[sort] ?? Number.POSITIVE_INFINITY;
      const bv = b[sort] ?? Number.POSITIVE_INFINITY;
      return (Number(av) - Number(bv)) * dir;
    });
    return out;
  }, [data.cars, make, city, fuel, gearbox, body, yearMin, yearMax, priceMin, priceMax, mileageMax, q, sort, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setSortMode = (mode: string) => {
    setPage(1);
    switch (mode) {
      case "price-asc": setSort("price"); setSortDir("asc"); break;
      case "price-desc": setSort("price"); setSortDir("desc"); break;
      case "year-desc": setSort("year"); setSortDir("desc"); break;
      case "year-asc": setSort("year"); setSortDir("asc"); break;
      case "mileage-asc": setSort("mileage"); setSortDir("asc"); break;
    }
  };
  const sortValue = `${sort}-${sortDir}`;

  const clearAll = () => {
    setQ(""); setMake(""); setCity(""); setFuel(""); setGearbox(""); setBody("");
    setYearMin(""); setYearMax(""); setPriceMin(""); setPriceMax(""); setMileageMax("");
    setSort("price"); setSortDir("asc"); setPage(1);
  };

  const onFilterChange = (fn: () => void) => { fn(); setPage(1); };

  const updatedLabel = new Date(data.updatedAt).toLocaleDateString(
    lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  );

  const selectCls =
    "text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5";
  const inputCls =
    "text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 w-full";

  return (
    <div>
      <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        {t.updated}: {updatedLabel} · {data.count.toLocaleString()} {t.total} · {t.showing}{" "}
        {filtered.length.toLocaleString()} {t.of} {data.count.toLocaleString()}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 mb-3">
        <input
          value={q}
          onChange={(e) => onFilterChange(() => setQ(e.target.value))}
          placeholder={t.search}
          className={inputCls + " sm:col-span-2 md:col-span-3"}
        />
        <select value={make} onChange={(e) => onFilterChange(() => setMake(e.target.value))} className={selectCls}>
          <option value="">{t.make} — {t.any}</option>
          {makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={city} onChange={(e) => onFilterChange(() => setCity(e.target.value))} className={selectCls}>
          <option value="">{t.city} — {t.any}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fuel} onChange={(e) => onFilterChange(() => setFuel(e.target.value))} className={selectCls}>
          <option value="">{t.fuel} — {t.any}</option>
          {fuels.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={gearbox} onChange={(e) => onFilterChange(() => setGearbox(e.target.value))} className={selectCls}>
          <option value="">{t.gearbox} — {t.any}</option>
          {gearboxes.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={body} onChange={(e) => onFilterChange(() => setBody(e.target.value))} className={selectCls}>
          <option value="">{t.body} — {t.any}</option>
          {bodies.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          type="number" inputMode="numeric" min={1950} max={2030}
          value={yearMin} onChange={(e) => onFilterChange(() => setYearMin(e.target.value))}
          placeholder={t.yearMin} className={inputCls}
        />
        <input
          type="number" inputMode="numeric" min={1950} max={2030}
          value={yearMax} onChange={(e) => onFilterChange(() => setYearMax(e.target.value))}
          placeholder={t.yearMax} className={inputCls}
        />
        <input
          type="number" inputMode="numeric" min={0}
          value={priceMin} onChange={(e) => onFilterChange(() => setPriceMin(e.target.value))}
          placeholder={t.priceMin} className={inputCls}
        />
        <input
          type="number" inputMode="numeric" min={0}
          value={priceMax} onChange={(e) => onFilterChange(() => setPriceMax(e.target.value))}
          placeholder={t.priceMax} className={inputCls}
        />
        <input
          type="number" inputMode="numeric" min={0}
          value={mileageMax} onChange={(e) => onFilterChange(() => setMileageMax(e.target.value))}
          placeholder={t.mileageMax} className={inputCls}
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select value={sortValue} onChange={(e) => setSortMode(e.target.value)} className={selectCls}>
          <option value="price-asc">{t.sortPrice}</option>
          <option value="price-desc">{t.sortPriceDesc}</option>
          <option value="year-desc">{t.sortYear}</option>
          <option value="year-asc">{t.sortYearOld}</option>
          <option value="mileage-asc">{t.sortKm}</option>
        </select>
        <button
          type="button" onClick={clearAll}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t.clear}
        </button>
      </div>

      {slice.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 py-10 text-center">{t.none}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {slice.map((c) => (
            <a
              key={c.id}
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition p-3"
            >
              {c.image ? (
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  className="w-28 h-24 object-cover rounded-md flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <div className="w-28 h-24 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs flex-shrink-0">
                  {t.photo}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {c.make ?? ""} {c.model ?? c.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {[c.year, c.engine, c.fuel, c.gearbox].filter(Boolean).join(" · ")}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {[c.mileage != null ? `${numFmt(c.mileage)} km` : null, c.body, c.city].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {c.currency}{numFmt(c.price)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
          <button
            type="button" disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="px-3 py-1 text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button" disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
