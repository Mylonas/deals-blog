"use client";

import { useEffect, useState } from "react";
import { STR, langFromPath } from "@/lib/i18n";
import { usePathname } from "next/navigation";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const label = STR[langFromPath(usePathname() ?? "/")].theme;

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={dark}
      className="inline-flex items-center justify-center min-h-[44px] md:min-h-[36px] min-w-[44px] md:min-w-[36px] rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-800"
    >
      {dark ? (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
        </svg>
      ) : (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
