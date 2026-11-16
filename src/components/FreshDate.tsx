"use client";

import { useEffect, useState } from "react";
import { STR, formatDate, type Lang, type Tool } from "@/lib/i18n";

// A data date that says so, in words, when the data is older than its refresh threshold
// (the same limits the stale-data alert uses: fuel 3 days, supermarket 36 h, coffee and souvlaki
// 60 h). Pages are static, so the age is re-checked in the browser; the first render uses the
// build-time answer, so there is no layout shift for data that was already stale at build.
export const STALE_HOURS: Record<Tool, number> = { fuel: 72, supermarket: 36, coffee: 60, souvlaki: 60, jobs: 36 };

export default function FreshDate({
  updatedAt,
  lang,
  tool,
  builtStale,
  prefix = "",
}: {
  updatedAt: string;
  lang: Lang;
  tool: Tool;
  builtStale: boolean;
  prefix?: string;
}) {
  const [stale, setStale] = useState(builtStale);
  useEffect(() => {
    setStale(Date.now() - new Date(updatedAt).getTime() > STALE_HOURS[tool] * 3600 * 1000);
  }, [updatedAt, tool]);
  return (
    <>
      {prefix}
      <time dateTime={updatedAt}>{formatDate(updatedAt, lang)}</time>
      {stale && (
        <strong className="ml-1 font-semibold text-amber-900 dark:text-amber-300">
          <span aria-hidden="true">⚠ </span>
          {STR[lang].mayBeOld}
        </strong>
      )}
    </>
  );
}
