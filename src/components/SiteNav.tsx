"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TOOLS, STR, toolHref, toolFromPath, type Lang } from "@/lib/i18n";

// Permanent topic menu. Language-aware links, current page marked with
// aria-current="page". Below the md breakpoint it collapses into a disclosure
// button (aria-expanded / aria-controls), closable with Escape.
export default function SiteNav({ lang }: { lang: Lang }) {
  const s = STR[lang];
  const pathname = usePathname() ?? "/";
  const current = toolFromPath(pathname);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const link = (tool: (typeof TOOLS)[number], extra = "") => {
    const active = current === tool;
    return (
      <li key={tool}>
        <a
          href={toolHref(lang, tool)}
          aria-current={active ? "page" : undefined}
          className={`inline-flex items-center min-h-[44px] md:min-h-[36px] px-3 rounded-md text-sm font-medium ${extra} ${
            active
              ? "bg-blue-600 text-white"
              : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {s.tools[tool]}
        </a>
      </li>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="md:hidden order-2 inline-flex items-center gap-2 min-h-[44px] px-3 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
        <span>{open ? s.menuClose : s.menu}</span>
      </button>

      <nav
        id="site-menu"
        aria-label={s.mainNav}
        className={`${open ? "block" : "hidden"} md:block order-last md:order-2 w-full md:w-auto basis-full md:basis-auto`}
      >
        <ul className="flex flex-col md:flex-row md:items-center gap-1 py-2 md:py-0">
          {TOOLS.map((t) => link(t))}
        </ul>
      </nav>
    </>
  );
}
