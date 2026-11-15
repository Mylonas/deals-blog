"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { STR, langFromPath, pageHref } from "@/lib/i18n";

// Compact on phones: one short row of text, two buttons side by side. It is a
// labelled region at the end of the document, so it never sits in front of the
// focus order; it only overlays the bottom edge of the viewport, and the page gets
// matching bottom padding while it is open (see the body class toggled below).
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
    <div role="region" aria-label={s.cookieLabel} className="fixed bottom-0 inset-x-0 z-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 flex-1 leading-snug">
          {s.cookieText}{" "}
          <a href={pageHref(lang, "privacy")} className="text-blue-700 dark:text-blue-300 underline">
            {s.cookiePrivacy}
          </a>{" "}
          {s.cookieEnd}
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="flex-1 sm:flex-none min-h-[44px] px-4 text-sm rounded-md border border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {s.decline}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="flex-1 sm:flex-none min-h-[44px] px-4 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800"
          >
            {s.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
