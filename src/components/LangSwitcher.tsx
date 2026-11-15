"use client";
import { usePathname } from "next/navigation";
import { STR, langFromPath, type Lang } from "@/lib/i18n";

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "en", label: "EN", name: "English" },
  { lang: "el", label: "ΕΛ", name: "Ελληνικά" },
  { lang: "ru", label: "РУ", name: "Русский" },
];

export default function LangSwitcher() {
  const pathname = usePathname() ?? "/";
  const current = langFromPath(pathname);

  // Strip the language prefix to get the canonical path so switching language
  // stays on the same page.
  let canonical = pathname;
  if (current !== "en") canonical = canonical.slice(3) || "/";
  if (!canonical.startsWith("/")) canonical = "/" + canonical;

  const href = (l: Lang) => (l === "en" ? canonical : `/${l}${canonical === "/" ? "/" : canonical}`);

  return (
    <nav aria-label={STR[current].language}>
      <ul className="flex items-center text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        {OPTIONS.map((o) => {
          const active = o.lang === current;
          return (
            <li key={o.lang}>
              <a
                href={href(o.lang)}
                hrefLang={o.lang}
                lang={o.lang}
                aria-label={`${o.label} – ${o.name}`}
                aria-current={active ? "true" : undefined}
                className={`inline-flex items-center justify-center min-h-[44px] md:min-h-[36px] min-w-[44px] md:min-w-[36px] px-2.5 ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {o.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
