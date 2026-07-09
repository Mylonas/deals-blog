"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

// Leaflet touches `window` at import time — load the map client-side only
const PriceMap = dynamic(() => import("./PriceMap"), { ssr: false });

interface Station {
  brand: string;
  address: string;
  mapsUrl: string;
  district: string;
  price: number;
  lat: number | null;
  lng: number | null;
}

interface FuelData {
  updatedAt: string;
  fuels: {
    "95":      { label: string; stations: Station[] };
    "98":      { label: string; stations: Station[] };
    diesel:    { label: string; stations: Station[] };
    heating?:  { label: string; stations: Station[] };
  };
}

// Map Greek municipality names → 5 main Cyprus districts.
// Ambiguous names that exist in two districts (Αγία Βαρβάρα, Μανδριά,
// Περιστερώνα) are deliberately absent — the coordinate fallback in
// getDistrict decides those per station.
const DISTRICT_MAP: Record<string, string> = {
  "Λευκωσία": "Nicosia", "Αγλαντζιά": "Nicosia", "Λακατάμεια": "Nicosia",
  "Λατσιά": "Nicosia", "Καϊμακλί": "Nicosia", "Παλλουριώτισσα": "Nicosia",
  "Γέρι": "Nicosia", "Δάλι": "Nicosia", "Τσέρι": "Nicosia", "Αλάμπρα": "Nicosia",
  "Γαλάτα": "Nicosia", "Ευρύχου": "Nicosia", "Κακοπετριά": "Nicosia",
  "Πέρα Χωριό Νήσου": "Nicosia", "Στρόβολος": "Nicosia", "Έγκωμη": "Nicosia",
  "Ίδαλιο": "Nicosia", "Λύση": "Nicosia", "Μόρφου": "Nicosia",
  "Άγιος Δομέτιος": "Nicosia", "Ακάκι": "Nicosia", "Ακρόπολη": "Nicosia",
  "Αρεδιού": "Nicosia", "Αστρομερίτης": "Nicosia", "Δασούπολη": "Nicosia",
  "Δευτερά": "Nicosia", "Κάτω Πύργος": "Nicosia", "Κλήρου": "Nicosia",
  "Κοκκινοτριμιθιά": "Nicosia", "Λυθροδόντας": "Nicosia", "Λύμπια": "Nicosia",
  "Πέρα Ορεινής": "Nicosia", "Παλιομέτοχο": "Nicosia", "Πεδουλάς": "Nicosia",
  "Λεμεσός": "Limassol", "Δρόμος Καλαβασού - Ζυγίου": "Limassol",
  "Πολεμίδια": "Limassol", "Μέσα Γειτονιά": "Limassol", "Γερμασόγεια": "Limassol",
  "Αγία Φύλα": "Limassol", "Κολόσσι": "Limassol", "Επισκοπή": "Limassol",
  "Άγιος Αθανάσιος": "Limassol", "Ύψωνας": "Limassol", "Αγρός": "Limassol",
  "Βάση Επισκοπής": "Limassol", "Κάτω Πολεμίδια": "Limassol",
  "Κυπερούντα": "Limassol", "Μονή": "Limassol", "Πάνω Κυβίδες": "Limassol",
  "Πάνω Πλάτρες": "Limassol", "Παλώδια": "Limassol", "Παραμύθα": "Limassol",
  "Παρεκκλησιά": "Limassol", "Πελένδρι": "Limassol", "Πεντάκωμο": "Limassol",
  "Πισσούρι": "Limassol", "Σαϊτάς": "Limassol", "Τραχώνι": "Limassol",
  "Τριμίκλινη": "Limassol", "Τουριστική Περ. Αγίου Τύχωνα": "Limassol",
  "Λάρνακα": "Larnaca", "Αραδίππου": "Larnaca", "Δεκέλεια": "Larnaca",
  "Καλό Χωριό Λάρνακας": "Larnaca", "Λειβάδια": "Larnaca", "Κίτι": "Larnaca",
  "Μενεού": "Larnaca", "Κόρνος": "Larnaca", "Τρούλλοι": "Larnaca",
  "Αγγλισίδες": "Larnaca", "Αθιένου": "Larnaca", "Αλεθρικό": "Larnaca",
  "Δρομολαξιά": "Larnaca", "Δρόμος Λάρνακας - Δεκέλειας": "Larnaca",
  "Καλαβασός": "Larnaca", "Κοφίνου": "Larnaca", "Λεύκαρα": "Larnaca",
  "Μαζωτός": "Larnaca", "Μοσφιλωτή": "Larnaca", "Ξυλοφάγου": "Larnaca",
  "Ορμήδεια": "Larnaca", "Ορόκλινη": "Larnaca", "Πυργά": "Larnaca",
  "Πύλα": "Larnaca", "Σκαρίνου": "Larnaca", "Χοιροκιτία": "Larnaca",
  "Περιφερειακός Δρόμος Ξυλοτύμπου": "Larnaca",
  "Πάφος": "Paphos", "Χλώρακα": "Paphos", "Κισσόνεργα": "Paphos",
  "Μεσόγη": "Paphos", "Γεροσκήπου": "Paphos", "Τάλα": "Paphos",
  "Πέγεια": "Paphos", "Κολώνη": "Paphos", "Έμπα": "Paphos",
  "Αργάκα": "Paphos", "Αρόδες": "Paphos", "Γουδί": "Paphos",
  "Δρούσια": "Paphos", "Κονιά": "Paphos", "Νικόκλεια": "Paphos",
  "Πόλης Χρυσοχούς": "Paphos", "Στρουμπί": "Paphos",
  "Τάφοι των Βασιλέων": "Paphos", "Τίμη": "Paphos", "Τρεμιθούσα": "Paphos",
  "Αμμόχωστος": "Famagusta", "Αβδελλερό": "Famagusta", "Αυγόρου": "Famagusta",
  "Δερύνεια": "Famagusta", "Σωτήρα": "Famagusta", "Παραλίμνι": "Famagusta",
  "Αχερίτου": "Famagusta", "Λιοπέτρι": "Famagusta", "Αγία Νάπα": "Famagusta",
  "Βρυσούλες": "Famagusta", "Δασάκι της Άχνας": "Famagusta",
  "Πρωταράς": "Famagusta",
};

// fallback for municipality names the map doesn't know: nearest district hub
const DISTRICT_HUBS: [string, number, number][] = [
  ["Nicosia", 35.170, 33.360],
  ["Limassol", 34.685, 33.040],
  ["Larnaca", 34.918, 33.620],
  ["Paphos", 34.775, 32.424],
  ["Famagusta", 35.040, 33.980],
];

const DISTRICTS = ["All", "Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"];
const FUEL_KEYS = ["95", "98", "diesel", "heating"] as const;
type FuelKey = typeof FUEL_KEYS[number];

const FUEL_LABELS: Record<FuelKey, string> = {
  "95":      "Unleaded 95",
  "98":      "Unleaded 98",
  "diesel":  "Diesel",
  "heating": "Heating Oil",
};

function getDistrict(s: Station): string {
  const mapped = DISTRICT_MAP[s.district];
  if (mapped) return mapped;
  if (s.lat != null && s.lng != null) {
    let best = s.district;
    let bestDist = Infinity;
    for (const [name, lat, lng] of DISTRICT_HUBS) {
      const d = haversine(s.lat, s.lng, lat, lng);
      if (d < bestDist) { bestDist = d; best = name; }
    }
    return best;
  }
  return s.district;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GeoState = "idle" | "loading" | "active" | "denied" | "unsupported";

const UI = {
  en: {
    nearMe: "Near Me", locating: "Locating…", denied: "Location denied", unsupported: "Location unavailable",
    nearMeActive: "Near Me ✕", nearMeSubtitle: "Sorted by distance from your location",
    viewList: "☰ List", viewMap: "🗺 Map",
    mapOpen: "Open in Google Maps →", mapAria: "Petrol stations map",
    all: "All", brand: "Brand", address: "Address", area: "Area", dist: "Dist.", price: "Price",
    showingNearest: (n: number) => `Showing ${n} nearest stations`,
    showingCheapest: (n: number, d: string) => `Showing ${n} cheapest stations${d !== "All" ? ` in ${d}` : ""}`,
    noResults: (fuel: string, district: string) => `No stations found for ${fuel} in ${district}. Try a different district.`,
    source: "Source: Cyprus Gov Petroleum Prices",
  },
  el: {
    nearMe: "Κοντά μου", locating: "Εντοπισμός…", denied: "Άρνηση τοποθεσίας", unsupported: "Μη διαθέσιμο",
    nearMeActive: "Κοντά μου ✕", nearMeSubtitle: "Ταξινόμηση κατά απόσταση",
    viewList: "☰ Λίστα", viewMap: "🗺 Χάρτης",
    mapOpen: "Άνοιγμα στο Google Maps →", mapAria: "Χάρτης πρατηρίων καυσίμων",
    all: "Όλες", brand: "Εταιρεία", address: "Διεύθυνση", area: "Περιοχή", dist: "Απόσταση", price: "Τιμή",
    showingNearest: (n: number) => `Εμφάνιση ${n} κοντινότερων πρατηρίων`,
    showingCheapest: (n: number, d: string) => `Εμφάνιση ${n} φθηνότερων πρατηρίων${d !== "Όλες" ? ` σε ${d}` : ""}`,
    noResults: (fuel: string, district: string) => `Δεν βρέθηκαν πρατήρια για ${fuel} σε ${district}.`,
    source: "Πηγή: Παρατηρητήριο Τιμών Καυσίμων Κύπρου",
  },
  ru: {
    nearMe: "Рядом", locating: "Поиск…", denied: "Геолокация отклонена", unsupported: "Недоступно",
    nearMeActive: "Рядом ✕", nearMeSubtitle: "Сортировка по расстоянию",
    viewList: "☰ Список", viewMap: "🗺 Карта",
    mapOpen: "Открыть в Google Maps →", mapAria: "Карта АЗС",
    all: "Все", brand: "Бренд", address: "Адрес", area: "Район", dist: "Расст.", price: "Цена",
    showingNearest: (n: number) => `Показано ${n} ближайших АЗС`,
    showingCheapest: (n: number, d: string) => `Показано ${n} дешевейших АЗС${d !== "Все" ? ` в ${d}` : ""}`,
    noResults: (fuel: string, district: string) => `АЗС для ${fuel} в ${district} не найдены.`,
    source: "Источник: Портал цен на топливо Кипра",
  },
};

const DISTRICTS_I18N: Record<string, Record<string, string>> = {
  en: { All: "All", Nicosia: "Nicosia", Limassol: "Limassol", Larnaca: "Larnaca", Paphos: "Paphos", Famagusta: "Famagusta" },
  el: { All: "Όλες", Nicosia: "Λευκωσία", Limassol: "Λεμεσός", Larnaca: "Λάρνακα", Paphos: "Πάφος", Famagusta: "Αμμόχωστος" },
  ru: { All: "Все", Nicosia: "Никосия", Limassol: "Лимасол", Larnaca: "Ларнака", Paphos: "Пафос", Famagusta: "Фамагуста" },
};

const FUEL_LABELS_I18N: Record<string, Record<FuelKey, string>> = {
  en: { "95": "Unleaded 95", "98": "Unleaded 98", "diesel": "Diesel",               "heating": "Heating Oil" },
  el: { "95": "Αμόλυβδη 95", "98": "Αμόλυβδη 98", "diesel": "Πετρέλαιο Κίνησης", "heating": "Πετρέλαιο Θέρμανσης" },
  ru: { "95": "АИ-95",       "98": "АИ-98",        "diesel": "Дизель",              "heating": "Печное топливо" },
};

export default function FuelTable({ data, lang = "en" }: { data: FuelData; lang?: "en" | "el" | "ru" }) {
  const t = UI[lang];
  const districtLabels = DISTRICTS_I18N[lang];
  const fuelLabels = FUEL_LABELS_I18N[lang];
  const districtKeys = Object.keys(districtLabels);

  const availableKeys = FUEL_KEYS.filter((k) => !!data.fuels[k]);
  const [fuel, setFuel] = useState<FuelKey>("95");
  const [district, setDistrict] = useState(districtKeys[0]); // "All" / "Όλες" / "Все"
  const [view, setView] = useState<"list" | "map">("list");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");

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
        setDistrict("All"); // reset district filter — near-me handles sorting
      },
      () => setGeoState("denied")
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserCoords(null);
    setGeoState("idle");
  }, []);

  const SHOW = 10;

  const allStations = useMemo(() => {
    const all = data.fuels[fuel]?.stations ?? [];

    if (userCoords) {
      const withDist = all
        .filter((s) => s.lat !== null && s.lng !== null)
        .map((s) => ({
          ...s,
          distance: haversine(userCoords.lat, userCoords.lng, s.lat!, s.lng!),
        }))
        .sort((a, b) => a.distance - b.distance);
      const withoutCoords = all.filter((s) => s.lat === null || s.lng === null);
      return [...withDist, ...withoutCoords];
    }

    // district state holds the i18n label (e.g. "Όλες") — map back to EN key for filtering
    const enKey = Object.keys(districtLabels).find((k) => districtLabels[k] === district) ?? "All";
    return enKey === "All" ? all : all.filter((s) => getDistrict(s) === enKey);
  }, [fuel, district, data, userCoords, districtLabels]);

  // the list stays short and scannable; the map shows every station
  const stations = useMemo(() => allStations.slice(0, SHOW), [allStations]);

  const isNearMe = geoState === "active" && userCoords !== null;

  return (
    <div>
      {/* Fuel type selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {availableKeys.map((k) => (
          <button
            key={k}
            onClick={() => setFuel(k)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              fuel === k
                ? "bg-yellow-400 text-yellow-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {fuelLabels[k]}
          </button>
        ))}
      </div>

      {/* Location + district controls */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {/* Near Me button */}
        {!isNearMe ? (
          <button
            onClick={requestLocation}
            disabled={geoState === "loading" || geoState === "denied" || geoState === "unsupported"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              geoState === "denied" || geoState === "unsupported"
                ? "border-red-200 text-red-400 cursor-not-allowed bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                : geoState === "loading"
                ? "border-blue-200 text-blue-400 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 cursor-wait"
                : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            }`}
          >
            <span>{geoState === "loading" ? "⏳" : "📍"}</span>
            {geoState === "loading" ? t.locating : geoState === "denied" ? t.denied : geoState === "unsupported" ? t.unsupported : t.nearMe}
          </button>
        ) : (
          <button
            onClick={clearLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            📍 {t.nearMeActive}
          </button>
        )}

        {/* Divider */}
        {!isNearMe && <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>}

        {/* District buttons — hidden when Near Me is active */}
        {!isNearMe &&
          districtKeys.map((dk) => {
            const label = districtLabels[dk];
            return (
              <button
                key={dk}
                onClick={() => setDistrict(label)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  district === label
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            );
          })}

        {isNearMe && (
          <span className="text-xs text-blue-600 dark:text-blue-400">{t.nearMeSubtitle}</span>
        )}

        {/* List / Map view toggle */}
        <div className="ml-auto flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
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
      </div>

      {/* Map view — every matching station, price-pill markers */}
      {view === "map" && (
        allStations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
            {t.noResults(fuelLabels[fuel], district)}
          </p>
        ) : (
          <PriceMap
            venues={allStations.map((s) => ({
              name: s.brand,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              url: s.mapsUrl,
              price: s.price,
              distance: (s as any).distance ?? null,
            }))}
            userCoords={userCoords}
            lang={lang}
            linkLabel={t.mapOpen}
            ariaLabel={t.mapAria}
            priceDecimals={3}
          />
        )
      )}

      {/* Results */}
      {view === "list" && (stations.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {t.noResults(fuelLabels[fuel], district)}
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {isNearMe ? t.showingNearest(stations.length) : t.showingCheapest(stations.length, district)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="pb-2 pr-3 font-semibold text-gray-700 dark:text-gray-300">#</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700 dark:text-gray-300">{t.brand}</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700 dark:text-gray-300">{t.address}</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700 dark:text-gray-300">{t.area}</th>
                  {isNearMe && (
                    <th className="pb-2 pr-3 font-semibold text-gray-700 dark:text-gray-300">{t.dist}</th>
                  )}
                  <th className="pb-2 font-semibold text-gray-700 dark:text-gray-300 text-right">{t.price}</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => {
                  const dist = isNearMe && (s as any).distance != null
                    ? ((s as any).distance as number)
                    : null;
                  return (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 pr-3 text-gray-400 dark:text-gray-500 text-xs">{i + 1}</td>
                      <td className="py-3 pr-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{s.brand}</td>
                      <td className="py-3 pr-3">
                        <a
                          href={s.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {s.address}
                        </a>
                      </td>
                      <td className="py-3 pr-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{s.district}</td>
                      {isNearMe && (
                        <td className="py-3 pr-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {dist != null ? `${dist.toFixed(1)} km` : "—"}
                        </td>
                      )}
                      <td className="py-3 text-right font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                        €{s.price.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ))}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        {formatDate(data.updatedAt)} ·{" "}
        <a
          href="https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {t.source}
        </a>
      </p>
    </div>
  );
}
