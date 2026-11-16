import chains from "@/data/chains.json";

type Lang = "en" | "el" | "ru";
const BY_ID = new Map(chains.chains.map((c) => [c.id, c]));

/** Display name of a supermarket chain id in the page language; unknown ids fall back to the id. */
export function chainName(id: string, lang: Lang): string {
  const c = BY_ID.get(id) as Record<string, string> | undefined;
  return c ? c[lang] || c.en : id;
}

/** "A / B / +N" label for a list of chain ids (max 3 shown). */
export function chainLabel(ids: string[] | null | undefined, lang: Lang): string | null {
  if (!ids?.length) return null;
  const names = ids.map((i) => chainName(i, lang));
  return names.length <= 3 ? names.join(" / ") : `${names.slice(0, 3).join(" / ")} +${names.length - 3}`;
}
