import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mouxti.com";
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Mouxti";
export const OG_IMAGE = "/og-default.png";

const OG_ALT: Record<Lang, string> = {
  en: "Mouxti: Cyprus price trackers for petrol, supermarket, coffee and souvlaki",
  el: "Mouxti: τιμές στην Κύπρο για βενζίνη, σούπερ μάρκετ, καφέ και σουβλάκι",
  ru: "Mouxti: цены на Кипре на бензин, в супермаркетах, кофе и сувлаки",
};
const OG_LOCALE: Record<Lang, string> = { en: "en_GB", el: "el_GR", ru: "ru_RU" };

// Trailing-slash URL path of a page in a language. `path` has no slashes ("" = home).
export function pagePath(lang: Lang, path: string): string {
  const p = path ? `/${path}` : "";
  return `${lang === "en" ? "" : `/${lang}`}${p}/`;
}
export const absUrl = (lang: Lang, path: string) => `${SITE}${pagePath(lang, path)}`;

// One place that builds the whole <head> metadata for a page, so every page gets
// canonical + hreflang + complete Open Graph + Twitter card, and og:url always equals the canonical.
export function pageMeta(o: {
  lang: Lang;
  path: string;
  title: string; // final <title>, brand included
  description: string;
  type?: "website" | "article";
  og?: Record<string, unknown>;
}): Metadata {
  const { lang, path, title, description } = o;
  const url = absUrl(lang, path);
  const image = `${SITE}${OG_IMAGE}`;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: pagePath(lang, path),
      languages: {
        en: pagePath("en", path),
        el: pagePath("el", path),
        ru: pagePath("ru", path),
        "x-default": pagePath("en", path),
      },
    },
    openGraph: {
      type: o.type ?? "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[lang],
      images: [{ url: image, width: 1200, height: 630, alt: OG_ALT[lang] }],
      ...(o.og ?? {}),
    } as Metadata["openGraph"],
    twitter: { card: "summary_large_image", title, description, images: [{ url: image, alt: OG_ALT[lang] }] },
  };
}
