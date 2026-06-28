"use client";
import { usePathname } from "next/navigation";

export default function LangSwitcher() {
  const pathname = usePathname();
  const isGreek = pathname.startsWith("/el");
  const isRussian = pathname.startsWith("/ru");
  const isEnglish = !isGreek && !isRussian;

  const btn = (active: boolean) =>
    `px-3 py-1.5 transition-colors ${active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="flex items-center gap-1 text-sm font-medium border border-gray-200 rounded-lg overflow-hidden">
      <a href="/" className={btn(isEnglish)}>EN</a>
      <a href="/el/" className={btn(isGreek)}>ΕΛ</a>
      <a href="/ru/" className={btn(isRussian)}>РУ</a>
    </div>
  );
}
