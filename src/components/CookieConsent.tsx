"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { STR, langFromPath, pageHref } from "@/lib/i18n";

// One slim bar along the bottom edge (a single row on phones: short text + two compact
// buttons). It is a labelled region at the end of the document, so it never sits in front of the
// focus order; the page gets matching bottom padding while it is open (see the body class below).
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const lang = langFromPath(usePathname() ?? "/");
  const s = STR[lang];

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) setVisible(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cookie-open", visible);
    return () => document.body.classList.remove("cookie-open");
  }, [visible]);

  function choose(value: "accepted" | "declined") {
    localStorage.setItem("cookie-consent", value);
    window.dispatchEvent(new StorageEvent("storage", { key: "cookie-consent", newValue: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div role="region" aria-label={s.cookieLabel} className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-600 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <div className="max-w-4xl mx-auto px-3 py-1.5 flex items-center gap-2">
        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 flex-1 leading-tight">
          {s.cookieText}{" "}
          <a href={pageHref(lang, "privacy")} className="text-blue-700 dark:text-blue-300 underline">
            {s.cookiePrivacy}
          </a>
          {s.cookieEnd}
        </p>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="min-h-[36px] px-3 text-xs sm:text-sm rounded-md border border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {s.decline}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="min-h-[36px] px-3 text-xs sm:text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800"
          >
            {s.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
