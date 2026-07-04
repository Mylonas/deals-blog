"use client";
import { useState, useMemo, useCallback } from "react";

type Cafe = {
  cafe: string;
  freddo: number;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  url: string;
};

type City = {
  key: string;
  label: { en: string; el: string; ru: string };
  cafes: Cafe[];
};

type CoffeeData = { updatedAt: string; cities: City[] };

type Lang = "en" | "el" | "ru";
type GeoState = "idle" | "loading" | "active" | "denied" | "unsupported";

const T = {
  en: {
    venue: "Café", price: "Freddo Espresso", updated: "Updated", order: "Order →",
    nearMe: "📍 Near me", nearActive: "📍 Nearby first", clear: "✕",
    denied: "Location access denied — showing cheapest first.",
    unsupported: "Geolocation is not supported by this browser.",
    empty: "No café data for this city yet — check back soon.",
    note: "Prices are Wolt listings and may include a platform markup over the counter price. Cheapest branch shown per café brand. Updated weekly.",
  },
  el: {
    venue: "Καφετέρια", price: "Freddo Espresso", updated: "Ενημέρωση", order: "Παραγγελία →",
    nearMe: "📍 Κοντά μου", nearActive: "📍 Κοντινά πρώτα", clear: "✕",
    denied: "Δεν δόθηκε πρόσβαση τοποθεσίας — εμφανίζονται τα φθηνότερα πρώτα.",
    unsupported: "Ο περιηγητής δεν υποστηρίζει γεωεντοπισμό.",
    empty: "Δεν υπάρχουν ακόμα δεδομένα για αυτή την πόλη — ελέγξτε ξανά σύντομα.",
    note: "Οι τιμές είναι από το Wolt και ενδέχεται να περιλαμβάνουν προσαύξηση πλατφόρμας. Εμφανίζεται το φθηνότερο υποκατάστημα ανά αλυσίδα. Εβδομαδιαία ενημέρωση.",
  },
  ru: {
    venue: "Кафе", price: "Фреддо Эспрессо", updated: "Обновлено", order: "Заказать →",
    nearMe: "📍 Рядом со мной", nearActive: "📍 Сначала ближайшие", clear: "✕",
    denied: "Доступ к геолокации не разрешён — показаны самые дешёвые.",
    unsupported: "Браузер не поддерживает геолокацию.",
    empty: "Для этого города пока нет данных — загляните позже.",
    note: "Цены указаны по данным Wolt и могут включать наценку платформы. Для каждой сети показан самый дешёвый филиал. Обновляется еженедельно.",
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

export default function FreddoTable({ data, lang }: { data: CoffeeData; lang: Lang }) {
  const t = T[lang];
  const [cityKey, setCityKey] = useState(data.cities[0]?.key ?? "nicosia");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");

  const city = data.cities.find((c) => c.key === cityKey) ?? data.cities[0];

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

  const rows = useMemo(() => {
    const list = (city?.cafes ?? []).map((c) => ({
      ...c,
      distance:
        userCoords && c.lat != null && c.lng != null
          ? haversine(userCoords.lat, userCoords.lng, c.lat, c.lng)
          : null,
    }));
    // always cheapest first; with location active, nearby first then price
    list.sort((a, b) => {
      if (userCoords && a.distance != null && b.distance != null) {
        return a.distance - b.distance || a.freddo - b.freddo;
      }
      return a.freddo - b.freddo;
    });
    return list;
  }, [city, userCoords]);

  const updated = new Date(data.updatedAt).toLocaleString(
    lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU",
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div>
      {/* City tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {data.cities.map((c) => (
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
        <button
          onClick={geoState === "active" ? clearLocation : requestLocation}
          className={`ml-auto px-3 py-1 text-sm rounded-full border transition-colors ${
            geoState === "active"
              ? "bg-green-600 text-white border-green-600"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
          disabled={geoState === "loading"}
        >
          {geoState === "loading" ? "…" : geoState === "active" ? `${t.nearActive} ${t.clear}` : t.nearMe}
        </button>
      </div>

      {geoState === "denied" && (
        <p className="mb-4 text-xs text-red-500 dark:text-red-400">{t.denied}</p>
      )}
      {geoState === "unsupported" && (
        <p className="mb-4 text-xs text-red-500 dark:text-red-400">{t.unsupported}</p>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t.venue}</th>
                <th className="px-4 py-3 text-left">{t.price}</th>
                {userCoords && <th className="px-4 py-3 text-left">km</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((c) => (
                <tr key={c.url} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.cafe}</span>
                    {c.address && (
                      <span className="block text-xs text-gray-400 dark:text-gray-500">{c.address}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    €{c.freddo.toFixed(2)}
                  </td>
                  {userCoords && (
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {c.distance != null ? c.distance.toFixed(1) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      {t.order}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-between items-start gap-4 flex-wrap">
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">{t.note}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {t.updated}: {updated}
        </span>
      </div>
    </div>
  );
}
