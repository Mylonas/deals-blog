import places from "@/data/places.json";
import type { Lang } from "./i18n";

const MAP = places.places as Record<string, { en: string; ru: string }>;

/** Place name of the fuel data in the page language; Greek (the source name) for EL and for anything unmapped. */
export function placeName(source: string | null | undefined, lang: Lang): string {
  const s = (source ?? "").trim();
  if (!s || lang === "el") return s;
  return MAP[s]?.[lang] ?? s;
}
