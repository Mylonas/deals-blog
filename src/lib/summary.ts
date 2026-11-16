// Answer-first data for the home cards and the "cheapest right now" block on each tracker page,
// computed at build time from src/data. Every function returns null / [] when a figure cannot be
// derived reliably (nothing is ever invented; the change indicator exists only with real history).
import fs from "fs";
import path from "path";
import fuel from "@/data/fuel-prices.json";
import fuelHistory from "@/data/fuel-price-history.json";
import coffee from "@/data/coffee-prices.json";
import souvlaki from "@/data/souvlaki-prices.json";
import deals from "@/data/supermarket-deals.json";
import { chainLabel } from "./chains";
import { placeName } from "./places";
import { formatEuro, STR, type Lang, type Tool } from "./i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CITY: Record<string, Record<Lang, string>> = {
  nicosia: { en: "Nicosia", el: "Λευκωσία", ru: "Никосия" },
  limassol: { en: "Limassol", el: "Λεμεσός", ru: "Лимасол" },
  larnaca: { en: "Larnaca", el: "Λάρνακα", ru: "Ларнака" },
  paphos: { en: "Paphos", el: "Πάφος", ru: "Пафос" },
  famagusta: { en: "Famagusta", el: "Αμμόχωστος", ru: "Фамагуста" },
};
const cityName = (key: string, lang: Lang) => CITY[key]?.[lang] ?? key.charAt(0).toUpperCase() + key.slice(1);

export type Change = { dir: "down" | "up" | "same"; text: string } | null;
export type Answer = {
  figure: string;
  place: string;
  label: string;
  updatedAt: string;
  change: Change;
};
export type TopRow = { name: string; place: string; price: string };

const fmtShort = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang === "el" ? "el-GR" : "ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Nicosia" }).format(new Date(iso));

/** Latest Unleaded 95 minimum vs the previous history point (real data only). */
function fuelChange(lang: Lang): Change {
  const h = ((fuelHistory as any).history ?? []).filter((e: any) => typeof e?.["95"]?.min === "number");
  if (h.length < 2) return null;
  const a = h[h.length - 1]["95"].min as number;
  const b = h[h.length - 2]["95"].min as number;
  const s = STR[lang];
  const d = Math.round((a - b) * 1000) / 1000;
  const since = fmtShort(h[h.length - 2].ts, lang);
  const amount = formatEuro(Math.abs(d), lang, 3);
  if (d === 0) return { dir: "same", text: s.changeSame(since) };
  return { dir: d < 0 ? "down" : "up", text: s.changeVs(d < 0 ? s.down : s.up, amount, since) };
}

/** Real history records (one file per Cyprus date) written by the merge scripts; [] when none exist. */
function trackerRecords(kind: "coffee" | "souvlaki"): any[] {
  try {
    const dir = path.join(process.cwd(), "src", "data", "history", kind);
    return fs
      .readdirSync(dir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  } catch {
    return [];
  }
}
const cyDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Nicosia" }).format(new Date(iso));

/** Change vs the latest record from an EARLIER date than the data (needs two genuine data points; else null). */
function trackerChange(kind: "coffee" | "souvlaki", price: number, updatedAt: string, lang: Lang): Change {
  const dataDate = cyDate(updatedAt);
  const prev = [...trackerRecords(kind)].reverse().find((r) => r.d < dataDate && typeof r.home?.price === "number");
  if (!prev) return null;
  const s = STR[lang];
  const d = Math.round((price - prev.home.price) * 100) / 100;
  const since = fmtShort(prev.d + "T12:00:00Z", lang);
  if (d === 0) return { dir: "same", text: s.changeSame(since) };
  return { dir: d < 0 ? "down" : "up", text: s.changeVs(d < 0 ? s.down : s.up, formatEuro(Math.abs(d), lang, 2), since) };
}

function fuelStations(): any[] {
  const seen = new Set<string>();
  return ((fuel as any).fuels?.["95"]?.stations ?? [])
    .filter((x: any) => typeof x.price === "number" && x.price > 0.5 && x.price < 5)
    .sort((a: any, b: any) => a.price - b.price)
    .filter((x: any) => (seen.has(x.address) ? false : (seen.add(x.address), true)));
}
const coffeeRows = (): any[] => {
  const seen = new Set<string>();
  return ((coffee as any).cities ?? [])
    .flatMap((c: any) => (c.cafes ?? []).map((x: any) => ({ ...x, city: c.key })))
    .filter((x: any) => typeof x.freddo === "number" && x.freddo >= 0.8 && x.freddo < 10)
    .sort((a: any, b: any) => a.freddo - b.freddo)
    .filter((x: any) => (seen.has(x.cafe) ? false : (seen.add(x.cafe), true)));
};
const souvlakiRows = (): any[] => {
  const seen = new Set<string>();
  return ((souvlaki as any).cities ?? [])
    .flatMap((c: any) => (c.venues ?? []).map((v: any) => ({ ...v, city: c.key })))
    // a Bolt price with no recorded source item has not been audited under the current rules
    .filter((v: any) => !(v.priceSources?.souvlaki === "bolt" && !v.items?.souvlaki))
    .filter((v: any) => typeof v.prices?.souvlaki === "number" && v.prices.souvlaki >= 1.5 && v.prices.souvlaki < 15)
    .sort((a: any, b: any) => a.prices.souvlaki - b.prices.souvlaki)
    .filter((v: any) => (seen.has(v.name) ? false : (seen.add(v.name), true)));
};
const dealRows = (): any[] =>
  ((deals as any).deals ?? [])
    .filter((d: any) => typeof d.discountPct === "number" && d.discountPct > 0 && d.discountPct <= 90 && d.name && d.price > 0)
    .sort((a: any, b: any) => b.discountPct - a.discountPct);

export function answer(tool: Tool, lang: Lang): Answer | null {
  const s = STR[lang];
  try {
    switch (tool) {
      case "fuel": {
        const st = fuelStations()[0];
        return st ? { figure: formatEuro(st.price, lang, 3) + s.perLitre, place: `${st.brand}, ${placeName(st.district, lang)}`, label: s.cardLabel.fuel, updatedAt: (fuel as any).updatedAt, change: fuelChange(lang) } : null;
      }
      case "supermarket": {
        const d = dealRows()[0];
        if (!d) return null;
        const chain = chainLabel(d.storeIds, lang);
        return {
          figure: formatEuro(d.price, lang, 2),
          place: chain ? `${d.name} · ${chain}` : d.name,
          label: s.cardLabel.supermarket,
          updatedAt: (deals as any).updatedAt,
          change: { dir: "down", text: s.changeFrom(formatEuro(d.previousPrice - d.price, lang, 2), formatEuro(d.previousPrice, lang, 2)) },
        };
      }
      case "coffee": {
        const c = coffeeRows()[0];
        return c ? { figure: formatEuro(c.freddo, lang), place: `${c.cafe}, ${cityName(c.city, lang)}`, label: s.cardLabel.coffee, updatedAt: (coffee as any).updatedAt, change: trackerChange("coffee", c.freddo, (coffee as any).updatedAt, lang) } : null;
      }
      case "souvlaki": {
        const v = souvlakiRows()[0];
        return v ? { figure: formatEuro(v.prices.souvlaki, lang), place: `${v.name}, ${cityName(v.city, lang)}`, label: s.cardLabel.souvlaki, updatedAt: (souvlaki as any).updatedAt, change: trackerChange("souvlaki", v.prices.souvlaki, (souvlaki as any).updatedAt, lang) } : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** The three cheapest right now, for the summary block under a tracker page's title. */
export function topThree(tool: Tool, lang: Lang): TopRow[] {
  try {
    switch (tool) {
      case "fuel":
        return fuelStations().slice(0, 3).map((x: any) => ({ name: x.brand, place: placeName(x.district, lang), price: formatEuro(x.price, lang, 3) + STR[lang].perLitre }));
      case "supermarket":
        return dealRows().slice(0, 3).map((d: any) => ({ name: d.name, place: chainLabel(d.storeIds, lang) ?? "", price: formatEuro(d.price, lang, 2) }));
      case "coffee":
        return coffeeRows().slice(0, 3).map((c: any) => ({ name: c.cafe, place: cityName(c.city, lang), price: formatEuro(c.freddo, lang) }));
      case "souvlaki":
        return souvlakiRows().slice(0, 3).map((v: any) => ({ name: v.name, place: cityName(v.city, lang), price: formatEuro(v.prices.souvlaki, lang) }));
      default:
        return [];
    }
  } catch {
    return [];
  }
}
