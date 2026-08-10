import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deals-blog.pages.dev";

// Required for output: "export" — emit as a static file at build time.
export const dynamic = "force-static";

// Emitted as a static /robots.txt at build (output: "export"). Everything is
// public and crawlable; the only job here is to point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
