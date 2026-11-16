// Headline figures for the home page, computed at build time from src/data.
// Each returns null when the figure cannot be derived reliably, and the card then
// simply omits it.
import fuel from "@/data/fuel-prices.json";
import coffee from "@/data/coffee-prices.json";
import souvlaki from "@/data/souvlaki-prices.json";
import supermarket from "@/data/supermarket-prices.json";
import jobs from "@/data/public-jobs.json";
import deals from "@/data/supermarket-deals.json";
import { formatEuro, STR, type Lang, type Tool } from "./i18n";

export type Headline = { figure: string; label: string; updatedAt: string } | null;

const min = (xs: number[]) => (xs.length ? Math.min(...xs) : null);

/* eslint-disable @typescript-eslint/no-explicit-any */
export function headline(tool: Tool, lang: Lang): Headline {
  const s = STR[lang];
  try {
    switch (tool) {
      case "fuel": {
        const prices = ((fuel as any).fuels?.["95"]?.stations ?? [])
          .map((x: any) => x.price)
          .filter((p: any) => typeof p === "number" && p > 0.5 && p < 5);
        const m = min(prices);
        return m === null
          ? null
          : { figure: formatEuro(m, lang, 3) + s.perLitre, label: s.figureLabel.fuel, updatedAt: (fuel as any).updatedAt };
      }
      case "supermarket": {
        // the biggest current price cut on e-Kalathi (price vs the previous price), with the product
        const top = ((deals as any).deals ?? [])
          .filter((d: any) => typeof d.discountPct === "number" && d.discountPct > 0 && d.discountPct <= 90 && d.name)
          .sort((a: any, b: any) => b.discountPct - a.discountPct)[0];
        return top
          ? { figure: "−" + top.discountPct + "%", label: s.figureLabel.supermarket + ": " + top.name + " (" + formatEuro(top.price, lang, 2) + ", " + s.wasWord + " " + formatEuro(top.previousPrice, lang, 2) + ")", updatedAt: (deals as any).updatedAt }
          : null;
      }
      case "coffee": {
        const prices = ((coffee as any).cities ?? [])
          .flatMap((c: any) => c.cafes ?? [])
          .map((x: any) => x.freddo)
          .filter((p: any) => typeof p === "number" && p >= 0.8 && p < 10);
        const m = min(prices);
        return m === null
          ? null
          : { figure: formatEuro(m, lang), label: s.figureLabel.coffee, updatedAt: (coffee as any).updatedAt };
      }
      case "souvlaki": {
        const prices = ((souvlaki as any).cities ?? [])
          .flatMap((c: any) => c.venues ?? [])
          // a Bolt price with no recorded source item has not been audited under the current rules
          .filter((v: any) => !(v.priceSources?.souvlaki === "bolt" && !v.items?.souvlaki))
          .map((v: any) => v.prices?.souvlaki)
          .filter((p: any) => typeof p === "number" && p >= 1.5 && p < 15);
        const m = min(prices);
        return m === null
          ? null
          : { figure: formatEuro(m, lang), label: s.figureLabel.souvlaki, updatedAt: (souvlaki as any).updatedAt };
      }
      case "jobs": {
        const n = (jobs as any).count ?? (jobs as any).jobs?.length;
        return typeof n === "number" && n > 0
          ? { figure: s.vacancies(n), label: s.figureLabel.jobs, updatedAt: (jobs as any).fetchedAt }
          : null;
      }
    }
  } catch {
    return null;
  }
}
