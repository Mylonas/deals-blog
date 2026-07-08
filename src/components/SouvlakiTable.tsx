"use client";
import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

// Leaflet touches `window` at import time — load the map client-side only
const PriceMap = dynamic(() => import("./PriceMap"), { ssr: false });

type Provider = "wolt" | "bolt" | "foody";
type Venue = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  prices: Partial<Record<CutKey, number>>;
  platforms?: Provider[];
  priceSources?: Partial<Record<CutKey, Provider>>;
  boltUrl?: string;
  foodyUrl?: string;
};

type City = {
  key: string;
  label: { en: string; el: string; ru: string };
  venues: Venue[];
};

type SouvlakiData = { updatedAt: string; cities: City[] };

type Lang = "en" | "el" | "ru";
type CutKey = "souvlaki" | "chicken" | "mix" | "souvlakiLarge" | "chickenLarge" | "mixLarge" | "porkchop";
type GeoState = "idle" | "loading" | "active" | "denied" | "unsupported";

const CUT_KEYS: CutKey[] = ["souvlaki", "chicken", "mix", "souvlakiLarge", "chickenLarge", "mixLarge", "porkchop"];

// order matters — badges render in this sequence
const PROVIDERS: Provider[] = ["wolt", "bolt", "foody"];
const PROVIDER_LABEL: Record<Provider, string> = { wolt: "Wolt", bolt: "Bolt", foody: "Foody" };
const PROVIDER_CLASS: Record<Provider, string> = {
  wolt: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50",
  bolt: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50",
  foody: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50",
};

// the merged venue keeps its primary platform's link in `url` and each extra
// platform's link in `<platform>Url` (see merge-souvlaki-sources.mjs)
function platformUrl(v: Venue, platform: Provider): string | undefined {
  const primary = v.platforms?.[0] ?? "wolt";
  if (platform === primary) return v.url;
  const u = (v as Record<string, unknown>)[`${platform}Url`];
  return typeof u === "string" ? u : undefined;
}

const T = {
  en: {
    cuts: { souvlaki: "Pork Souvlaki", chicken: "Chicken Souvlaki", mix: "Mix", souvlakiLarge: "Pork — Large Pitta", chickenLarge: "Chicken — Large Pitta", mixLarge: "Mix — Large Pitta", porkchop: "Pork Chop (portion)" } as Record<CutKey, string>,
    venue: "Place", price: "Price", updated: "Updated", order: "Order →", providers: "Order from",
    mapOrder: "Order from", mapAria: "Souvlaki venues map",
    viewList: "☰ List", viewMap: "🗺 Map",
    nearMe: "📍 Near me", nearActive: "📍 Nearby first", clear: "✕",
    denied: "Location access denied — showing cheapest first.",
    unsupported: "Geolocation is not supported by this browser.",
    empty: "No venues offer this cut in pita right now.",
    note: "Prices are for the regular Cypriot pitta — Greek, Arabic, mini and half pittas are excluded as smaller/non-comparable, and where a venue's default is a smaller size the regular (κανονική) upgrade price is used. Large pitta = ενισχυμένη. Pork chop is a portion dish. Each price is the cheapest across Wolt, Bolt and Foody for that place; the badges link to each platform and prices may include a platform markup. Updated weekly.",
  },
  el: {
    cuts: { souvlaki: "Σουβλάκι Χοιρινό", chicken: "Σουβλάκι Κοτόπουλο", mix: "Μιχτή", souvlakiLarge: "Χοιρινό — Ενισχυμένη", chickenLarge: "Κοτόπουλο — Ενισχυμένη", mixLarge: "Μιχτή — Ενισχυμένη", porkchop: "Μπριζόλα (μερίδα)" } as Record<CutKey, string>,
    venue: "Μαγαζί", price: "Τιμή", updated: "Ενημέρωση", order: "Παραγγελία →", providers: "Παραγγελία από",
    mapOrder: "Παραγγελία από", mapAria: "Χάρτης μαγαζιών σουβλακιού",
    viewList: "☰ Λίστα", viewMap: "🗺 Χάρτης",
    nearMe: "📍 Κοντά μου", nearActive: "📍 Κοντινά πρώτα", clear: "✕",
    denied: "Δεν δόθηκε πρόσβαση τοποθεσίας — εμφανίζονται τα φθηνότερα πρώτα.",
    unsupported: "Ο περιηγητής δεν υποστηρίζει γεωεντοπισμό.",
    empty: "Κανένα μαγαζί δεν προσφέρει αυτό το είδος σε πίτα αυτή τη στιγμή.",
    note: "Οι τιμές αφορούν κανονική κυπριακή πίτα — ελληνική, αραβική, μίνι και μισή πίτα εξαιρούνται ως μικρότερες/μη συγκρίσιμες, και όπου το προεπιλεγμένο μέγεθος είναι μικρότερο χρησιμοποιείται η τιμή της κανονικής. Ενισχυμένη = μεγάλη πίτα. Η μπριζόλα είναι μερίδα. Κάθε τιμή είναι η φθηνότερη ανά μαγαζί μεταξύ Wolt, Bolt και Foody· τα σήματα συνδέουν στην κάθε πλατφόρμα και ενδέχεται να περιλαμβάνουν προσαύξηση πλατφόρμας. Εβδομαδιαία ενημέρωση.",
  },
  ru: {
    cuts: { souvlaki: "Сувлаки (свинина)", chicken: "Сувлаки (курица)", mix: "Микс", souvlakiLarge: "Свинина — большая пита", chickenLarge: "Курица — большая пита", mixLarge: "Микс — большая пита", porkchop: "Свиная отбивная (порция)" } as Record<CutKey, string>,
    venue: "Заведение", price: "Цена", updated: "Обновлено", order: "Заказать →", providers: "Заказать в",
    mapOrder: "Заказать в", mapAria: "Карта заведений с сувлаки",
    viewList: "☰ Список", viewMap: "🗺 Карта",
    nearMe: "📍 Рядом со мной", nearActive: "📍 Сначала ближайшие", clear: "✕",
    denied: "Доступ к геолокации не разрешён — показаны самые дешёвые.",
    unsupported: "Браузер не поддерживает геолокацию.",
    empty: "Сейчас ни одно заведение не предлагает этот вариант в пите.",
    note: "Цены указаны за обычную кипрскую питу — греческая, арабская, мини и половинная пита исключены как меньшие/несравнимые; если размер по умолчанию меньше, берётся цена обычного размера (κανονική). Большая пита = ενισχυμένη. Свиная отбивная — порционное блюдо. Каждая цена — самая низкая по заведению среди Wolt, Bolt и Foody; значки ведут на каждую платформу, возможна наценка платформы. Обновляется еженедельно.",
  },
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SHOW = 15;

const ALL_LABEL = { en: "All Cyprus", el: "Όλη η Κύπρος", ru: "Весь Кипр" };

export default function SouvlakiTable({ data, lang }: { data: SouvlakiData; lang: Lang }) {
  const t = T[lang];
  const [cityKey, setCityKey] = useState("all");
  const [cut, setCut] = useState<CutKey>("souvlaki");
  const [view, setView] = useState<"list" | "map">("list");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");

  const cities = useMemo<City[]>(
    () => [
      { key: "all", label: ALL_LABEL, venues: data.cities.flatMap((c) => c.venues) },
      ...data.cities,
    ],
    [data]
  );

  const city = cities.find((c) => c.key === cityKey) ?? cities[0];

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("active");
      },
      () => setGeoState("denied")
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserCoords(null);
    setGeoState("idle");
  }, []);

  const allRows = useMemo(() => {
    const withCut = (city?.venues ?? [])
      .filter((v) => v.prices[cut] != null)
      .map((v) => ({
        ...v,
        price: v.prices[cut]!,
        distance:
          userCoords && v.lat != null && v.lng != null
            ? haversine(userCoords.lat, userCoords.lng, v.lat, v.lng)
            : null,
      }));
    // always cheapest first; with location active, nearby first then price
    withCut.sort((a, b) => {
      if (userCoords && a.distance != null && b.distance != null) {
        return a.distance - b.distance || a.price - b.price;
      }
      return a.price - b.price;
    });
    return withCut;
  }, [city, cut, userCoords]);

  // the list stays short and scannable; the map shows every venue
  const rows = useMemo(() => allRows.slice(0, SHOW), [allRows]);

  const updated = new Date(data.updatedAt).toLocaleString(
    lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div>
      {/* City tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {cities.map((c) => (
          <button
            key={c.key}
            onClick={() => setCityKey(c.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              cityKey === c.key
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {c.label[lang] ?? c.label.en}
          </button>
        ))}
      </div>

      {/* Cut selector + near me */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {CUT_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setCut(k)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              cut === k
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {t.cuts[k]}
          </button>
        ))}
        <div className="ml-auto flex gap-2 items-center">
          {/* List / Map view toggle */}
          <div className="flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm transition-colors ${
                  view === v
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                aria-pressed={view === v}
              >
                {v === "list" ? t.viewList : t.viewMap}
              </button>
            ))}
          </div>
          <button
            onClick={geoState === "active" ? clearLocation : requestLocation}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              geoState === "active"
                ? "bg-green-600 text-white border-green-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            disabled={geoState === "loading"}
          >
            {geoState === "loading" ? "…" : geoState === "active" ? `${t.nearActive} ${t.clear}` : t.nearMe}
          </button>
        </div>
      </div>

      {geoState === "denied" && (
        <p className="mb-4 text-xs text-red-500 dark:text-red-400">{t.denied}</p>
      )}
      {geoState === "unsupported" && (
        <p className="mb-4 text-xs text-red-500 dark:text-red-400">{t.unsupported}</p>
      )}

      {/* Map view — every matching venue, price-pill markers */}
      {view === "map" && (
        allRows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t.empty}</p>
        ) : (
          <PriceMap venues={allRows} userCoords={userCoords} lang={lang} linkLabel={t.mapOrder} ariaLabel={t.mapAria} />
        )
      )}

      {/* Table */}
      {view === "list" && (rows.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t.venue}</th>
                <th className="px-4 py-3 text-left">{t.price}</th>
                {userCoords && <th className="px-4 py-3 text-left">km</th>}
                <th className="px-4 py-3 text-left">{t.providers}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((v) => (
                <tr key={v.url} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{v.name}</span>
                    {v.address && (
                      <span className="block text-xs text-gray-400 dark:text-gray-500">{v.address}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    €{v.price.toFixed(2)}
                  </td>
                  {userCoords && (
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {v.distance != null ? v.distance.toFixed(1) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {PROVIDERS.filter((p) => (v.platforms?.length ? v.platforms : ["wolt"]).includes(p)).map((p) => {
                        const href = platformUrl(v, p);
                        const cls = `text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${PROVIDER_CLASS[p]}`;
                        return href ? (
                          <a key={p} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                            {PROVIDER_LABEL[p]}
                          </a>
                        ) : (
                          <span key={p} className={cls}>{PROVIDER_LABEL[p]}</span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mt-4 flex justify-between items-start gap-4 flex-wrap">
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">{t.note}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {t.updated}: {updated}
        </span>
      </div>
    </div>
  );
}
