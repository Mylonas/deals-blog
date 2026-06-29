"use client";
import { usePathname } from "next/navigation";

export default function LangSwitcher() {
  const pathname = usePathname();

  // Strip language prefix to get the canonical path so switching lang stays on same page
  let canonical = pathname;
  if (canonical.startsWith("/el")) canonical = canonical.slice(3) || "/";
  else if (canonical.startsWith("/ru")) canonical = canonical.slice(3) || "/";
  if (!canonical.startsWith("/")) canonical = "/" + canonical;

  const isGreek = pathname.startsWith("/el");
  const isRussian = pathname.startsWith("/ru");
  const isEnglish = !isGreek && !isRussian;

  const btn = (active: boolean) =>
    `px-3 py-1.5 transition-colors ${active ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`;

  const elPath = `/el${canonical === "/" ? "/" : canonical}`;
  const ruPath = `/ru${canonical === "/" ? "/" : canonical}`;

  return (
    <div className="flex items-center gap-1 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <a href={canonical} className={btn(isEnglish)}>EN</a>
      <a href={elPath} className={btn(isGreek)}>ΕΛ</a>
      <a href={ruPath} className={btn(isRussian)}>РУ</a>
    </div>
  );
}
