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
  return (
    <ul className="space-y-3">
      {offers.map((o) => (
        <li key={o.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">{o.store}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.channel[o.channel]}</span>
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 leading-snug">{o.deal[lang]}</p>
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
  );
}
