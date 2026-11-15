import { STR, TOOLS, formatDate, toolHref, type Lang } from "@/lib/i18n";
import { headline } from "@/lib/headlines";

// Tools hub shown on /, /el/ and /ru/: one card per tracker, each a single link
// with the headline figure and last-updated date computed at build time.
export default function HomeHub({ lang }: { lang: Lang }) {
  const s = STR[lang];
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{s.homeTitle}</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-8">{s.homeIntro}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const h = headline(t, lang);
          return (
            <li key={t}>
              <a
                href={toolHref(lang, t)}
                className="block h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-gray-700 p-5 hover:border-blue-600 hover:shadow-md"
              >
                <h2 className="text-lg font-bold mb-1">{s.tools[t]}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{s.toolSummary[t]}</p>
                {h && (
                  <p className="mb-2">
                    <span className="block text-sm text-gray-700 dark:text-gray-300">{h.label}</span>
                    <span className="block text-2xl font-bold text-blue-800 dark:text-blue-300">{h.figure}</span>
                  </p>
                )}
                {h && h.updatedAt && (
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {s.updated}: {formatDate(h.updatedAt, lang)}
                  </p>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
