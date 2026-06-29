"use client";

import { useState, useMemo, useCallback } from "react";

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
    "95": { label: string; stations: Station[] };
    "98": { label: string; stations: Station[] };
    diesel: { label: string; stations: Station[] };
  };
}

// Map Greek municipality names → 5 main Cyprus districts
const DISTRICT_MAP: Record<string, string> = {
  "Λευκωσία": "Nicosia", "Αγλαντζιά": "Nicosia", "Λακατάμεια": "Nicosia",
  "Λατσιά": "Nicosia", "Καϊμακλί": "Nicosia", "Παλλουριώτισσα": "Nicosia",
  "Γέρι": "Nicosia", "Δάλι": "Nicosia", "Τσέρι": "Nicosia", "Αλάμπρα": "Nicosia",
  "Γαλάτα": "Nicosia", "Ευρύχου": "Nicosia", "Κακοπετριά": "Nicosia",
  "Πέρα Χωριό Νήσου": "Nicosia", "Στρόβολος": "Nicosia", "Έγκωμη": "Nicosia",
  "Ίδαλιο": "Nicosia", "Λύση": "Nicosia", "Μόρφου": "Nicosia",
  "Λεμεσός": "Limassol", "Δρόμος Καλαβασού - Ζυγίου": "Limassol",
  "Πολεμίδια": "Limassol", "Μέσα Γειτονιά": "Limassol", "Γερμασόγεια": "Limassol",
  "Αγία Φύλα": "Limassol", "Κολόσσι": "Limassol", "Επισκοπή": "Limassol",
  "Λάρνακα": "Larnaca", "Αραδίππου": "Larnaca", "Δεκέλεια": "Larnaca",
  "Καλό Χωριό Λάρνακας": "Larnaca", "Λειβάδια": "Larnaca", "Κίτι": "Larnaca",
  "Μενεού": "Larnaca", "Κόρνος": "Larnaca", "Τρούλλοι": "Larnaca",
  "Πάφος": "Paphos", "Χλώρακα": "Paphos", "Κισσόνεργα": "Paphos",
  "Μεσόγη": "Paphos", "Γεροσκήπου": "Paphos", "Τάλα": "Paphos",
  "Πέγεια": "Paphos", "Κολώνη": "Paphos",
  "Αμμόχωστος": "Famagusta", "Αβδελλερό": "Famagusta", "Αυγόρου": "Famagusta",
  "Δερύνεια": "Famagusta", "Σωτήρα": "Famagusta", "Παραλίμνι": "Famagusta",
  "Αχερίτου": "Famagusta", "Λιοπέτρι": "Famagusta",
};

const DISTRICTS = ["All", "Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"];
const FUEL_KEYS = ["95", "98", "diesel"] as const;
type FuelKey = typeof FUEL_KEYS[number];

const FUEL_LABELS: Record<FuelKey, string> = {
  "95": "Unleaded 95",
  "98": "Unleaded 98",
  "diesel": "Diesel",
};

function getDistrict(raw: string): string {
  return DISTRICT_MAP[raw] ?? raw;
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
    all: "All", brand: "Brand", address: "Address", area: "Area", dist: "Dist.", price: "Price",
    showingNearest: (n: number) => `Showing ${n} nearest stations`,
    showingCheapest: (n: number, d: string) => `Showing ${n} cheapest stations${d !== "All" ? ` in ${d}` : ""}`,
    noResults: (fuel: string, district: string) => `No stations found for ${fuel} in ${district}. Try a different district.`,
    source: "Source: Cyprus Gov Petroleum Prices",
  },
  el: {
    nearMe: "Κοντά μου", locating: "Εντοπισμός…", denied: "Άρνηση τοποθεσίας", unsupported: "Μη διαθέσιμο",
    nearMeActive: "Κοντά μου ✕", nearMeSubtitle: "Ταξινόμηση κατά απόσταση",
    all: "Όλες", brand: "Εταιρεία", address: "Διεύθυνση", area: "Περιοχή", dist: "Απόσταση", price: "Τιμή",
    showingNearest: (n: number) => `Εμφάνιση ${n} κοντινότερων πρατηρίων`,
    showingCheapest: (n: number, d: string) => `Εμφάνιση ${n} φθηνότερων πρατηρίων${d !== "Όλες" ? ` σε ${d}` : ""}`,
    noResults: (fuel: string, district: string) => `Δεν βρέθηκαν πρατήρια για ${fuel} σε ${district}.`,
    source: "Πηγή: Παρατηρητήριο Τιμών Καυσίμων Κύπρου",
  },
  ru: {
    nearMe: "Рядом", locating: "Поиск…", denied: "Геолокация отклонена", unsupported: "Недоступно",
    nearMeActive: "Рядом ✕", nearMeSubtitle: "Сортировка по расстоянию",
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
  en: { "95": "Unleaded 95", "98": "Unleaded 98", "diesel": "Diesel" },
  el: { "95": "Αμόλυβδη 95", "98": "Αμόλυβδη 98", "diesel": "Πετρέλαιο Κίνησης" },
  ru: { "95": "АИ-95", "98": "АИ-98", "diesel": "Дизель" },
};

export default function FuelTable({ data, lang = "en" }: { data: FuelData; lang?: "en" | "el" | "ru" }) {
  const t = UI[lang];
  const districtLabels = DISTRICTS_I18N[lang];
  const fuelLabels = FUEL_LABELS_I18N[lang];
  const districtKeys = Object.keys(districtLabels);

  const [fuel, setFuel] = useState<FuelKey>("95");
  const [district, setDistrict] = useState(districtKeys[0]); // "All" / "Όλες" / "Все"
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

  const stations = useMemo(() => {
    const all = data.fuels[fuel].stations;

    if (userCoords) {
      const withDist = all
        .filter((s) => s.lat !== null && s.lng !== null)
        .map((s) => ({
          ...s,
          distance: haversine(userCoords.lat, userCoords.lng, s.lat!, s.lng!),
        }))
        .sort((a, b) => a.distance - b.distance);
      const withoutCoords = all.filter((s) => s.lat === null || s.lng === null);
      return [...withDist, ...withoutCoords].slice(0, SHOW);
    }

    // district state holds the i18n label (e.g. "Όλες") — map back to EN key for filtering
    const enKey = Object.keys(districtLabels).find((k) => districtLabels[k] === district) ?? "All";
    const filtered = enKey === "All" ? all : all.filter((s) => getDistrict(s.district) === enKey);
    return filtered.slice(0, SHOW);
  }, [fuel, district, data, userCoords, districtLabels]);

  const isNearMe = geoState === "active" && userCoords !== null;

  return (
    <div>
      {/* Fuel type selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FUEL_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setFuel(k)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              fuel === k
                ? "bg-yellow-400 text-yellow-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                ? "border-red-200 text-red-400 cursor-not-allowed bg-red-50"
                : geoState === "loading"
                ? "border-blue-200 text-blue-400 bg-blue-50 cursor-wait"
                : "border-blue-300 text-blue-600 hover:bg-blue-50"
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
        {!isNearMe && <span className="text-gray-300 text-xs">|</span>}

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
          <span className="text-xs text-blue-600">{t.nearMeSubtitle}</span>
        )}
      </div>

      {/* Results */}
      {stations.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">
          {t.noResults(fuelLabels[fuel], district)}
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {isNearMe ? t.showingNearest(stations.length) : t.showingCheapest(stations.length, district)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-3 font-semibold text-gray-700">#</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700">{t.brand}</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700">{t.address}</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-700">{t.area}</th>
                  {isNearMe && (
                    <th className="pb-2 pr-3 font-semibold text-gray-700">{t.dist}</th>
                  )}
                  <th className="pb-2 font-semibold text-gray-700 text-right">{t.price}</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => {
                  const dist = isNearMe && (s as any).distance != null
                    ? ((s as any).distance as number)
                    : null;
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 pr-3 font-medium text-gray-800 whitespace-nowrap">{s.brand}</td>
                      <td className="py-3 pr-3">
                        <a
                          href={s.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {s.address}
                        </a>
                      </td>
                      <td className="py-3 pr-3 text-gray-500 text-xs whitespace-nowrap">{s.district}</td>
                      {isNearMe && (
                        <td className="py-3 pr-3 text-gray-500 text-xs whitespace-nowrap">
                          {dist != null ? `${dist.toFixed(1)} km` : "—"}
                        </td>
                      )}
                      <td className="py-3 text-right font-bold text-green-700 whitespace-nowrap">
                        €{s.price.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-gray-400">
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
