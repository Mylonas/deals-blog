import type { MetadataRoute } from "next";
import { getAllPosts, type Lang } from "@/lib/posts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deals-blog.pages.dev";
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Pages that exist in every language (plus trends, English-only).
  const shared: { path: string; langs: Lang[]; priority: number }[] = [
    { path: "", langs: LANGS, priority: 1 },
    { path: "jobs", langs: LANGS, priority: 0.9 },
    { path: "privacy", langs: LANGS, priority: 0.3 },
    { path: "trends", langs: ["en"], priority: 0.5 },
  ];
  for (const { path, langs, priority } of shared) {
    for (const lang of langs) {
      entries.push({
        url: pageUrl(lang, path),
        lastModified: now,
        changeFrequency: path === "" || path === "jobs" ? "daily" : "monthly",
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
        lastModified: lastMod ? new Date(lastMod) : now,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: alternates(langs, `posts/${slug}`),
      });
    }
  }

  return entries;
}
