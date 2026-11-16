"use client";

import { usePathname } from "next/navigation";
import { TOOLS, STR, toolHref, toolFromPath, type Lang } from "@/lib/i18n";
import { ACCENT, ToolIcon } from "@/lib/toolTheme";

// Always-visible tracker bar (no menu to open): icon above the label on phones, icon beside it
// from sm up. Language-aware links; the current page carries aria-current="page" and an
// accent underline, so the signal is not colour alone.
export default function SiteNav({ lang }: { lang: Lang }) {
  const s = STR[lang];
  const current = toolFromPath(usePathname() ?? "/");
  return (
    <nav aria-label={s.mainNav} className="basis-full order-last">
      <ul className="grid grid-cols-4 gap-1 pb-1 sm:flex sm:justify-center sm:gap-2">
        {TOOLS.map((t) => {
          const active = current === t;
          const ac = ACCENT[t];
          return (
            <li key={t} className="min-w-0 sm:flex-none">
              <a
                href={toolHref(lang, t)}
                aria-current={active ? "page" : undefined}
                className={`flex no-underline min-h-[52px] sm:min-h-[44px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-md border-b-[3px] px-1 sm:px-3 text-[12px] sm:text-sm font-medium leading-tight text-center ${ac.text} ${
                  active ? `${ac.bar} ${ac.chip}` : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <ToolIcon tool={t} className="w-5 h-5 shrink-0" />
                <span className="min-w-0 break-words">{s.tools[t]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
