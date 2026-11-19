import { STR, TOOLS, pageHref, toolHref, type Lang } from "@/lib/i18n";
import FreshDate, { STALE_HOURS } from "@/components/FreshDate";
import { answer } from "@/lib/summary";
import { ACCENT, ToolIcon } from "@/lib/toolTheme";
import BlackFridayStrip from "@/components/BlackFridayStrip";
import { cyprusToday } from "@/lib/blackFriday";

// Home (/, /el/, /ru/): the answer first. Four cards, each ONE link: icon + label, the big
// number, the place, a change indicator (only where real history exists), the data date and a
// "see all prices" cue. Then one light trust strip that links to About. Nothing else.
export default function HomeHub({ lang }: { lang: Lang }) {
  const s = STR[lang];
  const cards = TOOLS.map((t) => ({ t, a: answer(t, lang) }));
  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{s.todayTitle}</h1>
      </header>

      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ t, a }) => {
          const ac = ACCENT[t];
          return (
            <li key={t} className="min-w-0">
              <a
                href={toolHref(lang, t)}
                className={`flex h-full flex-col no-underline rounded-2xl border p-3 sm:p-4 transition-shadow motion-reduce:transition-none hover:shadow-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ${ac.card} ${ac.ring}`}
              >
                <span className={`flex items-center gap-2 text-sm font-semibold ${ac.text}`}>
                  <ToolIcon tool={t} className="w-5 h-5 shrink-0" />
                  <span className="min-w-0">{a?.label ?? s.tools[t]}</span>
                </span>
                {a ? (
                  <>
                    <span className={`mt-2 block text-3xl sm:text-4xl font-extrabold tracking-tight leading-none ${ac.text}`}>{a.figure}</span>
                    <span className="mt-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug break-words">{a.place}</span>
                    {a.change && (
                      <span className="mt-1.5 flex items-start gap-1 text-xs font-medium text-gray-800 dark:text-gray-200">
                        <span aria-hidden="true">{a.change.dir === "down" ? "↓" : a.change.dir === "up" ? "↑" : "→"}</span>
                        <span>{a.change.text}</span>
                      </span>
                    )}
                    <span className="mt-auto pt-2 block text-xs text-gray-700 dark:text-gray-300">
                      <FreshDate updatedAt={a.updatedAt} lang={lang} tool={t} builtStale={Date.now() - new Date(a.updatedAt).getTime() > STALE_HOURS[t] * 3600 * 1000} />
                    </span>
                  </>
                ) : null}
                <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${ac.text}`}>
                  {s.seeAll} <span aria-hidden="true">→</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <BlackFridayStrip lang={lang} buildDay={cyprusToday()} />

      <section aria-label={s.trustLink} className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <ul className="grid gap-1.5 sm:grid-cols-3 text-sm text-gray-800 dark:text-gray-200">
          {s.trust.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden="true" className="text-emerald-700 dark:text-emerald-400">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          <a href={pageHref(lang, "about")} className="inline-flex items-center min-h-[24px] text-blue-700 dark:text-blue-300 underline">
            {s.trustLink} →
          </a>
        </p>
      </section>
    </div>
  );
}
