"use client";

import { useState, useMemo } from "react";
import brentData from "@/data/brent.json";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

type FuelStats = { min: number; avg: number; max: number };
type HistoryEntry = {
  ts: string;
  "95": FuelStats;
  "98": FuelStats;
  diesel: FuelStats;
  heating?: FuelStats;
  brent?: number; // Brent crude converted to EUR per litre
};

type Lang = "en" | "el" | "ru";
type View = "min" | "avg" | "max";

const LABELS = {
  en: {
    title: "Price History",
    d7: "7 days", d30: "30 days", d90: "90 days", d365: "1 year",
    noData: "Not enough history yet — check back soon.",
    diesel: "Diesel",
    heating: "Heating Oil",
    brent: "Brent Crude (per litre)",
    brentNow: "Brent crude", brentAsOf: "as of", brentNote: "Daily market price, converted to € per litre. It has its own date and updates separately from the pump prices.",
    viewMin: "Lowest", viewAvg: "Average", viewMax: "Highest",
  },
  el: {
    title: "Ιστορικό Τιμών",
    d7: "7 ημέρες", d30: "30 ημέρες", d90: "90 ημέρες", d365: "1 χρόνος",
    noData: "Δεν υπάρχει αρκετό ιστορικό ακόμα — ελέγξτε ξανά σύντομα.",
    diesel: "Πετρέλαιο",
    heating: "Πετρέλαιο Θέρμανσης",
    brent: "Αργό Brent (ανά λίτρο)",
    brentNow: "Αργό Brent", brentAsOf: "στις", brentNote: "Ημερήσια τιμή αγοράς, μετατρεμμένη σε € ανά λίτρο. Έχει δική της ημερομηνία και ενημερώνεται ξεχωριστά από τις τιμές αντλίας.",
    viewMin: "Χαμηλότερη", viewAvg: "Μέση", viewMax: "Υψηλότερη",
  },
  ru: {
    title: "История цен",
    d7: "7 дней", d30: "30 дней", d90: "90 дней", d365: "1 год",
    noData: "Истории пока недостаточно — загляните позже.",
    diesel: "Дизель",
    heating: "Печное топливо",
    brent: "Нефть Brent (за литр)",
    brentNow: "Нефть Brent", brentAsOf: "на", brentNote: "Ежедневная рыночная цена в € за литр. У неё своя дата, и она обновляется отдельно от цен на заправках.",
    viewMin: "Мин.", viewAvg: "Средняя", viewMax: "Макс.",
  },
};

const RANGES: { key: string; days: number }[] = [
  { key: "d7",   days: 7 },
  { key: "d30",  days: 30 },
  { key: "d90",  days: 90 },
  { key: "d365", days: 365 },
];

const VIEWS: View[] = ["min", "avg", "max"];

// Brent daily series (own daily workflow): value on or before a given day.
const BRENT_SERIES: { d: string; eurPerLitre: number }[] = brentData.series;
function brentOn(ts: string): number | null {
  const day = new Date(ts).toISOString().slice(0, 10);
  if (!BRENT_SERIES.length || day < BRENT_SERIES[0].d) return null;
  let v: number | null = null;
  for (const p of BRENT_SERIES) { if (p.d <= day) v = p.eurPerLitre; else break; }
  return v;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function FuelChart({ history, lang = "en" }: { history: HistoryEntry[]; lang?: Lang }) {
  const t = LABELS[lang];
  const [range, setRange] = useState<string>("d30");
  const [view, setView] = useState<View>("min");

  const days = RANGES.find(r => r.key === range)?.days ?? 30;

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history
      .filter(e => new Date(e.ts).getTime() >= cutoff && e["95"] && typeof e["95"] === "object")
      .map(e => ({
        date: formatDate(e.ts),
        "95":     e["95"][view],
        "98":     e["98"][view],
        diesel:   e.diesel[view],
        heating:  e.heating?.[view] ?? null,
        // crude has no min/avg/max — same value in every view
        brent:    brentOn(e.ts) ?? e.brent ?? null,
      }));
  }, [history, days, view]);

  if (filtered.length < 2) {
    return <p className="text-sm text-gray-600 dark:text-gray-400 py-4">{t.noData}</p>;
  }

  const prices = filtered.flatMap(e => {
    const vals: number[] = [e["95"], e["98"], e.diesel];
    if (e.heating !== null) vals.push(e.heating);
    return vals;
  });
  const minP = Math.floor((Math.min(...prices) - 0.05) * 100) / 100;
  const maxP = Math.ceil((Math.max(...prices) + 0.05) * 100) / 100;

  // Brent lives on its own right-hand axis so it doesn't squash the pump lines
  const brentVals = filtered.map(e => e.brent).filter((v): v is number => v !== null);
  const hasBrent = brentVals.length > 0;
  const brentMin = hasBrent ? Math.floor((Math.min(...brentVals) - 0.02) * 100) / 100 : 0;
  const brentMax = hasBrent ? Math.ceil((Math.max(...brentVals) + 0.02) * 100) / 100 : 1;

  const viewLabel: Record<View, string> = { min: t.viewMin, avg: t.viewAvg, max: t.viewMax };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t.title}</h2>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                range === r.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {t[r.key as keyof typeof t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              view === v
                ? "bg-amber-700 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {viewLabel[v]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={filtered} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-gray-600 dark:text-gray-400"
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              domain={[minP, maxP]}
              tickFormatter={v => `€${v.toFixed(3)}`}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-gray-600 dark:text-gray-400"
              width={60}
            />
            {hasBrent && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[brentMin, brentMax]}
                tickFormatter={v => `€${v.toFixed(3)}`}
                tick={{ fontSize: 11, fill: "#8b5cf6" }}
                width={60}
              />
            )}
            <Tooltip
              formatter={(v, name) => [`€${Number(v).toFixed(3)}`, name as string]}
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                border: "1px solid var(--tooltip-border, #e5e7eb)",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Line yAxisId="left"  type="monotone" dataKey="95"      name="Unleaded 95" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="98"      name="Unleaded 98" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="diesel"  name={t.diesel}    stroke="#10b981" strokeWidth={2} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="heating" name={t.heating}   stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} />
            {hasBrent && (
              <Line yAxisId="right" type="monotone" dataKey="brent" name={t.brent}     stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300" data-testid="brent-line">
        <strong>{t.brentNow}:</strong> €{brentData.eurPerLitre.toFixed(3)}/L (${brentData.usdPerBarrel.toFixed(2)}/bbl) — {t.brentAsOf}{" "}
        <time dateTime={brentData.asOf}>{new Date(brentData.asOf + "T12:00:00Z").toLocaleDateString(lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
      </p>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t.brentNote}</p>
    </div>
  );
}
