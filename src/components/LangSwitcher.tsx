"use client";
import { usePathname } from "next/navigation";

export default function LangSwitcher() {
  const pathname = usePathname();
  const isGreek = pathname.startsWith("/el");

  return (
    <div className="flex items-center gap-1 text-sm font-medium border border-gray-200 rounded-lg overflow-hidden">
      <a
        href="/"
        className={`px-3 py-1.5 transition-colors ${
          !isGreek ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        EN
      </a>
      <a
        href="/el/"
        className={`px-3 py-1.5 transition-colors ${
          isGreek ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        ΕΛ
      </a>
    </div>
  );
}
