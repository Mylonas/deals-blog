import { STR, homeHref, type Lang } from "@/lib/i18n";
import { BF_STR, cyprusToday } from "@/lib/blackFriday";
import BlackFridayList from "@/components/BlackFridayList";

export default function BlackFridayPage({ lang }: { lang: Lang }) {
  const s = BF_STR[lang];
  return (
    <div className="max-w-2xl">
      <nav aria-label={STR[lang].breadcrumb} className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 text-gray-700 dark:text-gray-300">
          <li>
            <a href={homeHref(lang)} className="inline-flex items-center min-h-[24px] text-blue-700 dark:text-blue-300 underline">
              {STR[lang].home}
            </a>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">{s.homeLabel}</li>
        </ol>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{s.h1}</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{s.lead}</p>
      <BlackFridayList lang={lang} buildDay={cyprusToday()} />
      <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{s.note}</p>
    </div>
  );
}
