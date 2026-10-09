"use client";

import { useState, useMemo, useCallback } from "react";
import vehicleDb from "@/data/vehicle-tanks.json";

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
    heating?: { label: string; stations: Station[] };
  };
}

interface VehicleModel {
  model: string;
  years: [number, number];
  tankLitres: number;
  fuelType: string;
}

type FuelKey = "95" | "98" | "diesel" | "heating";

const FUEL_LABELS_I18N: Record<string, Record<FuelKey, string>> = {
  en: { "95": "Unleaded 95", "98": "Unleaded 98", diesel: "Diesel", heating: "Heating Oil" },
  el: { "95": "Αμόλυβδη 95", "98": "Αμόλυβδη 98", diesel: "Πετρέλαιο Κίνησης", heating: "Πετρέλαιο Θέρμανσης" },
  ru: { "95": "АИ-95", "98": "АИ-98", diesel: "Дизель", heating: "Печное топливо" },
};

const FUEL_TYPE_TO_KEY: Record<string, FuelKey[]> = {
  petrol: ["95", "98"],
  diesel: ["diesel"],
  electric: [],
};

const GR: Record<string, string> = {
  "α": "a", "ά": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "έ": "e",
  "ζ": "z", "η": "i", "ή": "i", "θ": "th", "ι": "i", "ί": "i", "ϊ": "i",
  "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o", "ό": "o",
  "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y", "ύ": "y",
  "ϋ": "y", "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o", "ώ": "o",
};
const DI: Record<string, string> = {
  "αι": "e", "ει": "i", "οι": "i", "ου": "ou", "αυ": "av", "ευ": "ev",
  "μπ": "b", "ντ": "nt", "γκ": "gk", "γγ": "ng", "τσ": "ts", "τζ": "tz",
};
function toLatin(s: string): string {
  const low = s.toLowerCase();
  let out = "";
  for (let i = 0; i < low.length; i++) {
    const pair = low[i] + (low[i + 1] ?? "");
    if (DI[pair]) { out += DI[pair]; i++; continue; }
    out += GR[low[i]] ?? low[i];
  }
  return out;
}

const UI = {
  en: {
    title: "Compare Fuel Stations",
    subtitle: "Select stations and your vehicle to calculate monthly fuel cost differences",
    selectFuel: "Fuel type",
    stationA: "Station A",
    stationB: "Station B",
    searchStation: "Search by brand or address…",
    vehicle: "Your Vehicle",
    brand: "Brand",
    model: "Model",
    year: "Year",
    tankSize: "Tank size",
    litres: "litres",
    customTank: "Custom (litres)",
    refuels: "Refuels per month",
    refuelsHelp: "How many times do you fill up per month?",
    calculate: "Calculate",
    results: "Monthly Comparison",
    costAt: "Cost at",
    perFill: "per fill (≈85% of tank)",
    perMonth: "per month",
    saving: "You save",
    perMonthLabel: "/month",
    perYear: "/year",
    byChoosing: "by choosing",
    over: "over",
    noStations: "No stations available for this fuel type",
    electricWarning: "This vehicle is electric — no fuel comparison needed!",
    selectBoth: "Select two different stations to compare",
    orManual: "or enter manually:",
  },
  el: {
    title: "Σύγκριση Πρατηρίων Καυσίμων",
    subtitle: "Επιλέξτε πρατήρια και όχημα για να υπολογίσετε τη μηνιαία διαφορά κόστους",
    selectFuel: "Τύπος καυσίμου",
    stationA: "Πρατήριο Α",
    stationB: "Πρατήριο Β",
    searchStation: "Αναζήτηση κατά εταιρεία ή διεύθυνση…",
    vehicle: "Το Όχημά σας",
    brand: "Μάρκα",
    model: "Μοντέλο",
    year: "Έτος",
    tankSize: "Χωρητικότητα ντεπόζιτου",
    litres: "λίτρα",
    customTank: "Προσαρμοσμένη (λίτρα)",
    refuels: "Γεμίσματα/μήνα",
    refuelsHelp: "Πόσες φορές γεμίζετε ντεπόζιτο τον μήνα;",
    calculate: "Υπολογισμός",
    results: "Μηνιαία Σύγκριση",
    costAt: "Κόστος στο",
    perFill: "ανά γέμισμα (≈85% ντεπ.)",
    perMonth: "ανά μήνα",
    saving: "Εξοικονομείτε",
    perMonthLabel: "/μήνα",
    perYear: "/χρόνο",
    byChoosing: "επιλέγοντας",
    over: "αντί",
    noStations: "Δεν υπάρχουν πρατήρια για αυτόν τον τύπο καυσίμου",
    electricWarning: "Αυτό το όχημα είναι ηλεκτρικό — δεν χρειάζεται σύγκριση καυσίμων!",
    selectBoth: "Επιλέξτε δύο διαφορετικά πρατήρια για σύγκριση",
    orManual: "ή εισάγετε χειροκίνητα:",
  },
  ru: {
    title: "Сравнение АЗС",
    subtitle: "Выберите станции и транспорт для расчёта ежемесячной разницы в расходах",
    selectFuel: "Тип топлива",
    stationA: "Станция A",
    stationB: "Станция B",
    searchStation: "Поиск по бренду или адресу…",
    vehicle: "Ваш автомобиль",
    brand: "Марка",
    model: "Модель",
    year: "Год",
    tankSize: "Объём бака",
    litres: "литров",
    customTank: "Свой (литров)",
    refuels: "Заправок в месяц",
    refuelsHelp: "Сколько раз вы заправляетесь в месяц?",
    calculate: "Рассчитать",
    results: "Ежемесячное сравнение",
    costAt: "Стоимость на",
    perFill: "за заправку (≈85% бака)",
    perMonth: "в месяц",
    saving: "Вы экономите",
    perMonthLabel: "/мес",
    perYear: "/год",
    byChoosing: "выбирая",
    over: "вместо",
    noStations: "Нет станций для этого типа топлива",
    electricWarning: "Этот автомобиль электрический — сравнение топлива не нужно!",
    selectBoth: "Выберите две разные станции для сравнения",
    orManual: "или введите вручную:",
  },
};

function stationLabel(s: Station) {
  return `${s.brand} — ${s.address} (€${s.price.toFixed(3)})`;
}

export default function FuelCompare({
  data,
  lang = "en",
}: {
  data: FuelData;
  lang?: "en" | "el" | "ru";
}) {
  const t = UI[lang];
  const fuelLabels = FUEL_LABELS_I18N[lang];

  const availableFuels = (["95", "98", "diesel", "heating"] as FuelKey[]).filter(
    (k) => !!data.fuels[k]
  );

  const [fuel, setFuel] = useState<FuelKey>("95");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [stationA, setStationA] = useState<Station | null>(null);
  const [stationB, setStationB] = useState<Station | null>(null);
  const [showDropA, setShowDropA] = useState(false);
  const [showDropB, setShowDropB] = useState(false);

  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vYear, setVYear] = useState<number>(2022);
  const [customTank, setCustomTank] = useState<number | "">("");
  const [refuelsPerMonth, setRefuelsPerMonth] = useState(4);
  const [showResults, setShowResults] = useState(false);

  const stations = useMemo(() => {
    return data.fuels[fuel]?.stations ?? [];
  }, [fuel, data]);

  const filterStations = useCallback(
    (query: string) => {
      if (!query.trim()) return stations.slice(0, 20);
      const q = query.toLowerCase();
      return stations
        .filter(
          (s) =>
            s.brand.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.district.toLowerCase().includes(q) ||
            toLatin(s.address).includes(q) ||
            toLatin(s.district).includes(q)
        )
        .slice(0, 20);
    },
    [stations]
  );

  const filteredA = useMemo(() => filterStations(searchA), [filterStations, searchA]);
  const filteredB = useMemo(() => filterStations(searchB), [filterStations, searchB]);

  const brands = useMemo(
    () => vehicleDb.brands.map((b) => b.brand).sort(),
    []
  );

  const models = useMemo(() => {
    const b = vehicleDb.brands.find((b) => b.brand === vBrand);
    if (!b) return [];
    return b.models
      .filter((m) => m.fuelType !== "electric")
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [vBrand]);

  const selectedModel = useMemo(() => {
    if (!vBrand || !vModel) return null;
    const b = vehicleDb.brands.find((b) => b.brand === vBrand);
    return b?.models.find((m) => m.model === vModel) ?? null;
  }, [vBrand, vModel]);

  const years = useMemo(() => {
    if (!selectedModel) return [];
    const [from, to] = selectedModel.years;
    const arr: number[] = [];
    for (let y = to; y >= from; y--) arr.push(y);
    return arr;
  }, [selectedModel]);

  const isElectric = selectedModel?.fuelType === "electric";

  const tankSize = useMemo(() => {
    if (typeof customTank === "number" && customTank > 0) return customTank;
    return selectedModel?.tankLitres ?? 0;
  }, [customTank, selectedModel]);

  const matchingFuelKeys = useMemo(() => {
    if (!selectedModel) return availableFuels;
    return FUEL_TYPE_TO_KEY[selectedModel.fuelType] ?? availableFuels;
  }, [selectedModel, availableFuels]);

  const results = useMemo(() => {
    if (!stationA || !stationB || tankSize <= 0 || refuelsPerMonth <= 0) return null;

    const usableLitres = tankSize * 0.85;
    const fillCostA = stationA.price * usableLitres;
    const fillCostB = stationB.price * usableLitres;
    const monthlyCostA = fillCostA * refuelsPerMonth;
    const monthlyCostB = fillCostB * refuelsPerMonth;
    const diff = Math.abs(monthlyCostA - monthlyCostB);
    const cheaper = monthlyCostA <= monthlyCostB ? "A" : "B";

    return {
      fillCostA,
      fillCostB,
      monthlyCostA,
      monthlyCostB,
      diff,
      annualDiff: diff * 12,
      cheaper,
    };
  }, [stationA, stationB, tankSize, refuelsPerMonth]);

  const selectStation = (which: "A" | "B", station: Station) => {
    if (which === "A") {
      setStationA(station);
      setSearchA(stationLabel(station));
      setShowDropA(false);
    } else {
      setStationB(station);
      setSearchB(stationLabel(station));
      setShowDropB(false);
    }
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  return (
    <div className="mt-10 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {t.title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t.subtitle}
      </p>

      {/* Fuel type selector */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          {t.selectFuel}
        </label>
        <div className="flex gap-2 flex-wrap">
          {availableFuels.map((k) => {
            const disabled = matchingFuelKeys.length > 0 && !matchingFuelKeys.includes(k);
            return (
              <button
                key={k}
                onClick={() => {
                  setFuel(k);
                  setStationA(null);
                  setStationB(null);
                  setSearchA("");
                  setSearchB("");
                  setShowResults(false);
                }}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  fuel === k
                    ? "bg-blue-600 text-white"
                    : disabled
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {fuelLabels[k]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Station selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Station A */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            {t.stationA}
          </label>
          <input
            type="text"
            value={searchA}
            onChange={(e) => {
              setSearchA(e.target.value);
              setShowDropA(true);
              setStationA(null);
              setShowResults(false);
            }}
            onFocus={() => setShowDropA(true)}
            placeholder={t.searchStation}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showDropA && filteredA.length > 0 && (
            <ul
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredA.map((s, i) => (
                <li
                  key={`${s.brand}-${s.address}-${i}`}
                  onClick={() => selectStation("A", s)}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {s.brand}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> — {s.address}</span>
                  <span className="float-right font-bold text-green-700 dark:text-green-400">
                    €{s.price.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {stationA && (
            <div className="mt-1.5 text-xs text-green-700 dark:text-green-400 font-semibold">
              €{stationA.price.toFixed(3)} / {t.litres.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Station B */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            {t.stationB}
          </label>
          <input
            type="text"
            value={searchB}
            onChange={(e) => {
              setSearchB(e.target.value);
              setShowDropB(true);
              setStationB(null);
              setShowResults(false);
            }}
            onFocus={() => setShowDropB(true)}
            placeholder={t.searchStation}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showDropB && filteredB.length > 0 && (
            <ul
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredB.map((s, i) => (
                <li
                  key={`${s.brand}-${s.address}-${i}`}
                  onClick={() => selectStation("B", s)}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {s.brand}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> — {s.address}</span>
                  <span className="float-right font-bold text-green-700 dark:text-green-400">
                    €{s.price.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {stationB && (
            <div className="mt-1.5 text-xs text-green-700 dark:text-green-400 font-semibold">
              €{stationB.price.toFixed(3)} / {t.litres.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          {t.vehicle}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Brand */}
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-500 mb-1">{t.brand}</label>
            <select
              value={vBrand}
              onChange={(e) => {
                setVBrand(e.target.value);
                setVModel("");
                setCustomTank("");
                setShowResults(false);
              }}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-500 mb-1">{t.model}</label>
            <select
              value={vModel}
              onChange={(e) => {
                setVModel(e.target.value);
                setCustomTank("");
                setShowResults(false);
              }}
              disabled={!vBrand}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {models.map((m) => (
                <option key={m.model} value={m.model}>{m.model}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-500 mb-1">{t.year}</label>
            <select
              value={vYear}
              onChange={(e) => {
                setVYear(Number(e.target.value));
                setShowResults(false);
              }}
              disabled={years.length === 0}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.length === 0 ? (
                <option value={vYear}>{vYear}</option>
              ) : (
                years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))
              )}
            </select>
          </div>

          {/* Tank size display + custom override */}
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-500 mb-1">
              {t.tankSize}
            </label>
            {selectedModel && selectedModel.tankLitres > 0 ? (
              <div className="px-2 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-sm font-semibold text-green-800 dark:text-green-300">
                {selectedModel.tankLitres} {t.litres}
              </div>
            ) : (
              <input
                type="number"
                min={1}
                max={200}
                value={customTank}
                onChange={(e) => {
                  setCustomTank(e.target.value ? Number(e.target.value) : "");
                  setShowResults(false);
                }}
                placeholder={t.customTank}
                className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {isElectric && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            {t.electricWarning}
          </p>
        )}

        {/* Custom tank override when a model is selected */}
        {selectedModel && selectedModel.tankLitres > 0 && (
          <div className="mt-2">
            <label className="text-[11px] text-gray-400 dark:text-gray-500">
              {t.orManual}
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={customTank}
              onChange={(e) => {
                setCustomTank(e.target.value ? Number(e.target.value) : "");
                setShowResults(false);
              }}
              placeholder={`${selectedModel.tankLitres}`}
              className="ml-2 w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-gray-400 ml-1">{t.litres}</span>
          </div>
        )}
      </div>

      {/* Refuels per month */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
          {t.refuels}
        </label>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">{t.refuelsHelp}</p>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => {
                setRefuelsPerMonth(n);
                setShowResults(false);
              }}
              className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
                refuelsPerMonth === n
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={60}
            value={refuelsPerMonth}
            onChange={(e) => {
              setRefuelsPerMonth(Math.max(1, Math.min(60, Number(e.target.value) || 1)));
              setShowResults(false);
            }}
            className="w-14 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={!stationA || !stationB || tankSize <= 0 || isElectric}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t.calculate}
      </button>

      {/* Results */}
      {showResults && results && stationA && stationB && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{t.results}</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Station A costs */}
            <div className={`rounded-lg p-3 ${results.cheaper === "A" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800/30"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.costAt}</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {stationA.brand} — {stationA.address}
                  </p>
                </div>
                {results.cheaper === "A" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                    CHEAPER
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-gray-400">{t.perFill}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">€{results.fillCostA.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">{t.perMonth}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">€{results.monthlyCostA.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Station B costs */}
            <div className={`rounded-lg p-3 ${results.cheaper === "B" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800/30"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.costAt}</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {stationB.brand} — {stationB.address}
                  </p>
                </div>
                {results.cheaper === "B" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                    CHEAPER
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-gray-400">{t.perFill}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">€{results.fillCostB.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">{t.perMonth}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">€{results.monthlyCostB.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Savings summary */}
            {results.diff > 0 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t.saving}</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                  €{results.diff.toFixed(2)}
                  <span className="text-sm font-semibold">{t.perMonthLabel}</span>
                </p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  €{results.annualDiff.toFixed(2)}{t.perYear}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t.byChoosing}{" "}
                  <strong>
                    {results.cheaper === "A" ? stationA.brand : stationB.brand}
                  </strong>{" "}
                  {t.over}{" "}
                  <strong>
                    {results.cheaper === "A" ? stationB.brand : stationA.brand}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showResults && !results && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 text-center">
          {t.selectBoth}
        </p>
      )}
    </div>
  );
}
