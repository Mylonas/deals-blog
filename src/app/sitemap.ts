import type { MetadataRoute } from "next";
import { getAllPosts, type Lang } from "@/lib/posts";
import { BF_OFFERS, BF_PATH, cyprusToday, isSectionLive } from "@/lib/blackFriday";
import fuel from "@/data/fuel-prices.json";
import coffee from "@/data/coffee-prices.json";
import souvlaki from "@/data/souvlaki-prices.json";
import deals from "@/data/supermarket-deals.json";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mouxti.com";
const LANGS: Lang[] = ["en", "el", "ru"];

// Required for output: "export" — emit as a static file at build time.
export const dynamic = "force-static";

// The site uses trailingSlash: true, so every canonical URL ends in "/".
function pageUrl(lang: Lang, path: string): string {
  const p = path ? `/${path}` : "";
  const base = lang === "en" ? p : `/${lang}${p}`;
  return `${SITE}${base}/`;
}

// Google reads hreflang from <xhtml:link> alternates — Next emits these from
// `alternates.languages`. x-default points at the English page.
function alternates(langs: Lang[], path: string) {
  const languages: Record<string, string> = {};
  for (const l of langs) languages[l] = pageUrl(l, path);
  if (langs.includes("en")) languages["x-default"] = pageUrl("en", path);
  return { languages };
}

// lastmod comes from the real data date of each tracker (never the build time); pages with no
// dated data (about, contact, privacy, terms) get no lastmod rather than a fake one.
const dated = (v: unknown): Date | undefined => {
  const d = typeof v === "string" ? new Date(v) : undefined;
  return d && !isNaN(d.getTime()) ? d : undefined;
};
const latest = (...ds: (Date | undefined)[]) =>
  ds.filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
const LASTMOD: Record<string, Date | undefined> = {
  "fuel-prices-cyprus": dated((fuel as any).updatedAt),
  "posts/cheapest-coffee-nicosia": dated((coffee as any).updatedAt),
  "posts/cheapest-souvlaki-cyprus": dated((souvlaki as any).updatedAt),
  "posts/cheapest-supermarket-products": dated((deals as any).updatedAt),
  [BF_PATH]: latest(...BF_OFFERS.map((o) => dated(o.checked))),
};
LASTMOD[""] = latest(
  LASTMOD["fuel-prices-cyprus"],
  LASTMOD["posts/cheapest-coffee-nicosia"],
  LASTMOD["posts/cheapest-souvlaki-cyprus"],
  LASTMOD["posts/cheapest-supermarket-products"],
);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Pages that exist in every language (plus trends, English-only).
  const shared: { path: string; langs: Lang[]; priority: number }[] = [
    { path: "", langs: LANGS, priority: 1 },
    // Hidden for now: { path: "jobs", langs: LANGS, priority: 0.9 },
    { path: "about", langs: LANGS, priority: 0.4 },
    { path: "contact", langs: LANGS, priority: 0.3 },
    { path: "privacy", langs: LANGS, priority: 0.3 },
    { path: "terms", langs: LANGS, priority: 0.3 },
    // /trends/ is an internal page marked noindex,nofollow; it must not be in the sitemap.
    // Dedicated tool pages (not markdown posts).
    { path: "fuel-prices-cyprus", langs: LANGS, priority: 0.9 },
    { path: "posts/cheapest-souvlaki-cyprus", langs: LANGS, priority: 0.7 },
    { path: "posts/cheapest-supermarket-products", langs: LANGS, priority: 0.7 },
  ];
  // Black Friday section: only while it is live (hidden after the last end date).
  if (isSectionLive(cyprusToday())) shared.push({ path: BF_PATH, langs: LANGS, priority: 0.6 });
  for (const { path, langs, priority } of shared) {
    for (const lang of langs) {
      entries.push({
        url: pageUrl(lang, path),
        ...(LASTMOD[path] ? { lastModified: LASTMOD[path] } : {}),
        changeFrequency: path === "" || path === "jobs" || path === "fuel-prices-cyprus" ? "daily" : "monthly",
        priority,
        alternates: alternates(langs, path),
      });
    }
  }

  // Blog posts: enumerate per language, cross-link the languages that have each
  // slug, and date each entry from its own front-matter.
  const slugLangs = new Map<string, { langs: Lang[]; lastMod: string }>();
  for (const lang of LANGS) {
    for (const post of getAllPosts(lang)) {
      const cur = slugLangs.get(post.slug) ?? { langs: [], lastMod: "" };
      cur.langs.push(lang);
      const d = post.updated ?? post.date;
      if (d && d > cur.lastMod) cur.lastMod = d;
      slugLangs.set(post.slug, cur);
    }
  }
  for (const [slug, { langs, lastMod }] of slugLangs) {
    for (const lang of langs) {
      entries.push({
        url: pageUrl(lang, `posts/${slug}`),
        lastModified: LASTMOD[`posts/${slug}`] ?? (lastMod ? new Date(lastMod) : now),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: alternates(langs, `posts/${slug}`),
      });
    }
  }

  return entries;
}
