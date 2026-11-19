"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { BF_STR, bfHref, cyprusToday, isSectionLive, liveOffers } from "@/lib/blackFriday";

// Small home entry under the four cards; disappears once the section expires.
export default function BlackFridayStrip({ lang, buildDay }: { lang: Lang; buildDay: string }) {
  const s = BF_STR[lang];
  const [today, setToday] = useState(buildDay);
  useEffect(() => setToday(cyprusToday()), []);
  const n = liveOffers(today).length;
  if (!isSectionLive(today) || n === 0) return null;
  return (
    <a
      href={bfHref(lang)}
      className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 no-underline rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 hover:shadow-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2"
    >
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {s.homeLabel} <span className="font-normal text-gray-700 dark:text-gray-300">· {s.count(n)}</span>
      </span>
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
        {s.homeCta} <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}
