"use client";
import { useEffect, useState } from "react";
import { formatDate, type Lang } from "@/lib/i18n";
import { BF_STR, cyprusToday, isSectionLive, liveOffers } from "@/lib/blackFriday";

// Static export: the build-time list is correct for the build day; after mount the
// browser re-filters with today's Cyprus date so offers expire without a rebuild.
export default function BlackFridayList({ lang, buildDay }: { lang: Lang; buildDay: string }) {
  const s = BF_STR[lang];
  const [today, setToday] = useState(buildDay);
  useEffect(() => setToday(cyprusToday()), []);
  const offers = liveOffers(today);

  if (!isSectionLive(today) || offers.length === 0) {
    return <p className="text-sm text-gray-700 dark:text-gray-300">{s.expired}</p>;
  }
  const groups = [
    { title: s.productsTitle, items: offers.filter((o) => o.kind === "product") },
    { title: s.singleTitle, items: offers.filter((o) => o.kind === "single") },
    { title: s.storewideTitle, items: offers.filter((o) => o.kind === "storewide") },
  ].filter((g) => g.items.length);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="text-lg font-bold mb-2">{g.title}</h2>
          <ul className="space-y-3">
            {g.items.map((o) => (
              <li key={o.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">{o.store}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.channel[o.channel]}</span>
                </p>
                {o.kind !== "storewide" ? (
                  <>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{o.product}</p>
                    <p className="mt-0.5 text-gray-900 dark:text-gray-100">
                      <span className="text-2xl font-extrabold">€{o.price}</span>{" "}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.was} €{o.was}</span>
                    </p>
                    {o.kind === "single" && o.note && (
                      <p className="mt-1 text-xs text-gray-800 dark:text-gray-200">{o.note[lang]}</p>
                    )}
                    {o.compare && (
                      <p className="mt-1 text-xs text-gray-800 dark:text-gray-200">
                        {s.lowest}{" "}
                        {o.compare.stores.map((c, i) => (
                          <span key={c.store}>
                            {i > 0 ? ", " : ""}
                            {c.url ? (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 dark:text-blue-300">
                                {c.store} €{c.price}
                              </a>
                            ) : (
                              `${c.store} €${c.price}`
                            )}
                          </span>
                        ))}{" "}
                        · {s.compared} {formatDate(o.compare.date, lang)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 leading-snug">{o.deal[lang]}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300">
                  {o.starts ? `${s.from} ${formatDate(o.starts, lang)} · ` : ""}
                  {o.ends ? `${s.until} ${formatDate(o.ends, lang)}` : s.noEnd} · {s.checked} {formatDate(o.checked, lang)}
                </p>
                <p className="mt-1.5 text-sm">
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[24px] text-blue-700 dark:text-blue-300 underline">
                    {s.source} →
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
