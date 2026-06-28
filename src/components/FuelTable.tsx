"use client";

import { useState, useMemo } from "react";

interface Station {
  brand: string;
  address: string;
  mapsUrl: string;
  district: string;
  price: number;
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
  // Nicosia
  "Λευκωσία": "Nicosia", "Αγλαντζιά": "Nicosia", "Λακατάμεια": "Nicosia",
  "Λατσιά": "Nicosia", "Καϊμακλί": "Nicosia", "Παλλουριώτισσα": "Nicosia",
  "Γέρι": "Nicosia", "Δάλι": "Nicosia", "Τσέρι": "Nicosia", "Αλάμπρα": "Nicosia",
  "Γαλάτα": "Nicosia", "Ευρύχου": "Nicosia", "Κακοπετριά": "Nicosia",
  "Πέρα Χωριό Νήσου": "Nicosia", "Στρόβολος": "Nicosia", "Έγκωμη": "Nicosia",
  "Ίδαλιο": "Nicosia", "Λύση": "Nicosia", "Μόρφου": "Nicosia",
  // Limassol
  "Λεμεσός": "Limassol", "Δρόμος Καλαβασού - Ζυγίου": "Limassol",
  "Πολεμίδια": "Limassol", "Μέσα Γειτονιά": "Limassol", "Γερμασόγεια": "Limassol",
  "Αγία Φύλα": "Limassol", "Κολόσσι": "Limassol", "Επισκοπή": "Limassol",
  // Larnaca
  "Λάρνακα": "Larnaca", "Αραδίππου": "Larnaca", "Δεκέλεια": "Larnaca",
  "Καλό Χωριό Λάρνακας": "Larnaca", "Λειβάδια": "Larnaca", "Κίτι": "Larnaca",
  "Μενεού": "Larnaca", "Κόρνος": "Larnaca", "Τρούλλοι": "Larnaca",
  // Paphos
  "Πάφος": "Paphos", "Χλώρακα": "Paphos", "Κισσόνεργα": "Paphos",
  "Μεσόγη": "Paphos", "Γεροσκήπου": "Paphos", "Τάλα": "Paphos",
  "Πέγεια": "Paphos", "Κολώνη": "Paphos",
  // Famagusta
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

export default function FuelTable({ data }: { data: FuelData }) {
  const [fuel, setFuel] = useState<FuelKey>("95");
  const [district, setDistrict] = useState("All");

  const stations = useMemo(() => {
    const all = data.fuels[fuel].stations;
    if (district === "All") return all;
    return all.filter((s) => getDistrict(s.district) === district);
  }, [fuel, district, data]);

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
            {FUEL_LABELS[k]}
          </button>
        ))}
      </div>

      {/* District selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {DISTRICTS.map((d) => (
          <button
            key={d}
            onClick={() => setDistrict(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              district === d
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Results */}
      {stations.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">
          No stations found for {FUEL_LABELS[fuel]} in {district}. Try a different district.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Showing {stations.length} station{stations.length !== 1 ? "s" : ""} — sorted cheapest first
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-semibold text-gray-700">#</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700">Brand</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700">Address</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700">Area</th>
                  <th className="pb-2 font-semibold text-gray-700 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-gray-800">{s.brand}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={s.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {s.address}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{s.district}</td>
                    <td className="py-3 text-right font-bold text-green-700">
                      €{s.price.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Updated {formatDate(data.updatedAt)} ·{" "}
        <a
          href="https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Source: Cyprus Gov Petroleum Prices
        </a>
      </p>
    </div>
  );
}
