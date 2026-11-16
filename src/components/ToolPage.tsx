import { STR, TOOLS, formatDate, homeHref, toolHref, type Lang, type Tool } from "@/lib/i18n";
import { topThree } from "@/lib/summary";
import { ACCENT, ToolIcon } from "@/lib/toolTheme";

type Source = { label: string; href?: string };

// One template for the five trackers in all three languages:
// breadcrumb, h1, one-sentence summary, last-updated + source, optional
// collapsible details, then the tool itself, then links to the other trackers.
export default function ToolPage({
  lang,
  tool,
  title,
  updatedAt,
  source,
  details,
  wide = false,
  children,
}: {
  lang: Lang;
  tool: Tool;
  title: string;
  updatedAt?: string;
  source?: Source;
  details?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const s = STR[lang];
  const date = formatDate(updatedAt, lang);
  const ac = ACCENT[tool];
  const top = topThree(tool, lang);
  return (
    <div className={wide ? "max-w-3xl" : "max-w-2xl"}>
      <nav aria-label={s.breadcrumb} className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 text-gray-700 dark:text-gray-300">
          <li>
            <a href={homeHref(lang)} className="inline-flex items-center min-h-[24px] text-blue-700 dark:text-blue-300 underline">
              {s.home}
            </a>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">{s.tools[tool]}</li>
        </ol>
      </nav>

      <h1 className="flex items-start gap-3 text-2xl sm:text-3xl font-bold mb-2 leading-tight">
        <span className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-xl p-2 ${ac.chip}`}>
          <ToolIcon tool={tool} className="w-6 h-6" />
        </span>
        <span>{title}</span>
      </h1>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        {date && (
          <>
            {s.updated}: <time dateTime={updatedAt}>{date}</time>
          </>
        )}
        {date && source && " · "}
        {source && (
          <>
            {s.source}:{" "}
            {source.href ? (
              <a href={source.href} target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 underline">
                {source.label}
              </a>
            ) : (
              source.label
            )}
          </>
        )}
      </p>
      {top.length > 0 && (
        <section aria-labelledby="top-now" className={`mb-6 rounded-2xl border p-3 sm:p-4 ${ac.card.split(" ").filter((c) => !c.includes("hover:")).join(" ")}`}>
          <h2 id="top-now" className={`text-sm font-semibold mb-2 ${ac.text}`}>
            {s.topThreeTitle}
          </h2>
          <ol className="space-y-1.5">
            {top.map((r, i) => (
              <li key={r.name + i} className="flex items-baseline gap-2 text-sm">
                <span aria-hidden="true" className={`w-5 shrink-0 font-bold ${ac.text}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{r.name}</span>
                  {r.place && <span className="text-gray-700 dark:text-gray-300"> · {r.place}</span>}
                </span>
                <span className={`shrink-0 text-base font-extrabold ${ac.text}`}>{r.price}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {children}

      <details className="mt-10 text-sm text-gray-700 dark:text-gray-300">
        <summary className="cursor-pointer min-h-[44px] py-2 font-medium text-gray-900 dark:text-gray-100">{s.aboutData}</summary>
        <div className="mt-2 space-y-3">
          <p>{s.toolSummary[tool]}</p>
          {details}
        </div>
      </details>

      <nav aria-labelledby="other-trackers" className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
        <h2 id="other-trackers" className="text-lg font-semibold mb-3">
          {s.otherTrackers}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {TOOLS.filter((t) => t !== tool).map((t) => (
            <li key={t}>
              <a
                href={toolHref(lang, t)}
                className="inline-flex items-center min-h-[44px] px-4 rounded-md border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
              >
                {s.tools[t]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
