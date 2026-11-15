import "./globals.css";
import { LANGS, STR, TOOLS, homeHref, toolHref } from "@/lib/i18n";

// Served as /404.html for every unknown URL. The language of a missing page is
// unknown, so this page is in English with links to the trackers in all three
// languages.
export const metadata = { title: "Page not found | Mouxti", robots: { index: false } };

export default function GlobalNotFound() {
  const s = STR.en;
  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        <main className="max-w-2xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold mb-3">{s.notFoundTitle}</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{s.notFoundText}</p>
          <ul className="grid gap-2 mb-8">
            {TOOLS.map((t) => (
              <li key={t}>
                <a href={toolHref("en", t)} className="inline-flex items-center min-h-[44px] text-blue-700 dark:text-blue-300 underline">
                  {s.tools[t]}
                </a>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap gap-4">
            {LANGS.map((l) => (
              <a key={l} href={homeHref(l)} hrefLang={l} lang={l} className="inline-flex items-center min-h-[44px] text-blue-700 dark:text-blue-300 underline">
                {STR[l].home} ({l.toUpperCase()})
              </a>
            ))}
          </p>
        </main>
      </body>
    </html>
  );
}
