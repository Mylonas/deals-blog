import JobsTable, { type JobsData } from "@/components/JobsTable";
import data from "@/data/public-jobs.json";
import Link from "next/link";

export const metadata = {
  title: "Вакансии госсектора Кипра — актуальный список",
  description:
    "Все открытые вакансии государственного сектора Кипра в одном месте: госслужба (ΕΔΥ), полугосударственные организации, государственные университеты и научные центры, пять районных организаций самоуправления и все 20 муниципалитетов — с фильтром по району.",
};

export default function PublicJobsRu() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Работа
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Вакансии госсектора Кипра</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Все открытые вакансии государственного сектора Кипра из 62 официальных
        источников: конкурсы госслужбы (ΕΔΥ), полугосударственные организации
        (Cyta, ΑΗΚ, Управление портов, ΟΚΥπΥ, ΟΑΥ, регулирующие органы),
        государственные университеты, научные центры (Институт неврологии и
        генетики, Институт Кипра, CYENS), пять районных организаций самоуправления
        и все 20 муниципалитетов. Фильтруйте по району, чтобы видеть только то, что
        открыто рядом с вами. Сроки подачи заявок считываются из самих объявлений.
        Последнее обновление{" "}
        {new Date(data.fetchedAt).toLocaleDateString("ru-RU", {
          day: "numeric", month: "long", year: "numeric",
        })}.
      </p>

      <JobsTable data={data as unknown as JobsData} lang="ru" />

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        Юридически обязательным источником остаётся Официальная газета Республики
        (Επίσημη Εφημερίδα της Δημοκρατίας), выходящая по пятницам. Перед подачей
        заявки всегда проверяйте официальное объявление.
      </p>

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/ru" className="text-sm text-blue-500 hover:underline">← Назад к скидкам</Link>
      </div>
    </article>
  );
}
