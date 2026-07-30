"use client";
import { useMemo, useState } from "react";

type Lang = "en" | "el" | "ru";

export type Job = {
  id: string;
  sourceId: string;
  employer: string;
  sector: string;
  title: string;
  url: string;
  published: string | null;
  deadline: string | null;
  reference: string | null;
  deadlineFrom?: string;
};

export type JobsData = { fetchedAt: string; count: number; jobs: Job[] };

const T: Record<Lang, Record<string, string>> = {
  en: {
    total: "open positions", search: "Search position or employer…", any: "All",
    sector: "Sector", employer: "Employer", deadline: "Deadline", position: "Position",
    sortDeadline: "Closing soonest", sortEmployer: "By employer", sortNewest: "Newest first",
    clear: "Clear filters", none: "No positions match your filters.",
    showing: "Showing", of: "of", updated: "Updated", noDeadline: "—",
    closingSoon: "closes in", days: "days", today: "closes today",
    withDeadline: "With a stated deadline only",
    note: "Positions are listed in Greek, as published by each employer.",
  },
  el: {
    total: "κενές θέσεις", search: "Αναζήτηση θέσης ή εργοδότη…", any: "Όλα",
    sector: "Τομέας", employer: "Εργοδότης", deadline: "Προθεσμία", position: "Θέση",
    sortDeadline: "Λήγουν σύντομα", sortEmployer: "Ανά εργοδότη", sortNewest: "Νεότερες πρώτα",
    clear: "Καθαρισμός", none: "Καμία θέση με αυτά τα κριτήρια.",
    showing: "Εμφάνιση", of: "από", updated: "Ενημέρωση", noDeadline: "—",
    closingSoon: "λήγει σε", days: "μέρες", today: "λήγει σήμερα",
    withDeadline: "Μόνο με δηλωμένη προθεσμία",
    note: "Οι θέσεις παρατίθενται όπως δημοσιεύονται από κάθε εργοδότη.",
  },
  ru: {
    total: "вакансий", search: "Поиск должности или работодателя…", any: "Все",
    sector: "Сектор", employer: "Работодатель", deadline: "Срок подачи", position: "Должность",
    sortDeadline: "Скоро закрытие", sortEmployer: "По работодателю", sortNewest: "Сначала новые",
    clear: "Сбросить", none: "Нет вакансий по этим фильтрам.",
    showing: "Показано", of: "из", updated: "Обновлено", noDeadline: "—",
    closingSoon: "до закрытия", days: "дн.", today: "закрывается сегодня",
    withDeadline: "Только с указанным сроком",
    note: "Вакансии приводятся на греческом языке, как их публикует работодатель.",
  },
};

const SECTORS: Record<string, Record<Lang, string>> = {
  "civil-service": { en: "Civil Service", el: "Δημόσια Υπηρεσία", ru: "Госслужба" },
  "semi-government": { en: "Semi-government", el: "Ημικρατικοί", ru: "Полугосударственные" },
  "district-organisation": { en: "District Organisations", el: "Επαρχιακοί Οργανισμοί", ru: "Районные организации" },
  municipality: { en: "Municipalities", el: "Δήμοι", ru: "Муниципалитеты" },
};

const PAGE_SIZE = 40;

function daysUntil(date: string) {
  return Math.round((Date.parse(date) - Date.now()) / 86_400_000);
}

export default function JobsTable({ data, lang }: { data: JobsData; lang: Lang }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [employer, setEmployer] = useState("");
  const [datedOnly, setDatedOnly] = useState(false);
  const [sort, setSort] = useState<"deadline" | "employer" | "newest">("deadline");
  const [page, setPage] = useState(1);

  const employers = useMemo(
    () => [...new Set(data.jobs.map((j) => j.employer))].sort((a, b) => a.localeCompare(b, "el")),
    [data.jobs],
  );
  const sectors = useMemo(() => [...new Set(data.jobs.map((j) => j.sector))], [data.jobs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = data.jobs.filter((job) => {
      if (sector && job.sector !== sector) return false;
      if (employer && job.employer !== employer) return false;
      if (datedOnly && !job.deadline) return false;
      if (needle && !`${job.title} ${job.employer}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "employer") return a.employer.localeCompare(b.employer, "el") || a.title.localeCompare(b.title, "el");
      if (sort === "newest") return (b.published ?? "").localeCompare(a.published ?? "");
      // Deadline first, undated last — an undated row is not "closing never".
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.employer.localeCompare(b.employer, "el");
    });
  }, [data.jobs, q, sector, employer, datedOnly, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const reset = () => {
    setQ(""); setSector(""); setEmployer(""); setDatedOnly(false); setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <span className="font-semibold">{filtered.length} {t.total}</span>
        <span className="text-gray-500 dark:text-gray-400">· {t.updated} {data.fetchedAt.slice(0, 10)}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder={t.search}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 sm:col-span-2"
        />
        <select
          value={sector}
          onChange={(e) => { setSector(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">{t.sector}: {t.any}</option>
          {sectors.map((s) => <option key={s} value={s}>{SECTORS[s]?.[lang] ?? s}</option>)}
        </select>
        <select
          value={employer}
          onChange={(e) => { setEmployer(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">{t.employer}: {t.any}</option>
          {employers.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="deadline">{t.sortDeadline}</option>
          <option value="employer">{t.sortEmployer}</option>
          <option value="newest">{t.sortNewest}</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={datedOnly} onChange={(e) => { setDatedOnly(e.target.checked); setPage(1); }} />
          {t.withDeadline}
        </label>
        <button onClick={reset} className="text-blue-600 dark:text-blue-400 hover:underline">{t.clear}</button>
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 py-8 text-center">{t.none}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-3 font-semibold">{t.employer}</th>
                <th className="py-2 pr-3 font-semibold">{t.position}</th>
                <th className="py-2 font-semibold whitespace-nowrap">{t.deadline}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => {
                const left = job.deadline ? daysUntil(job.deadline) : null;
                const urgent = left !== null && left <= 7;
                return (
                  <tr key={job.id} className="border-t border-gray-200 dark:border-gray-800 align-top">
                    <td className="py-2.5 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{job.employer}</td>
                    <td className="py-2.5 pr-3">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {job.title}
                      </a>
                      {job.reference && (
                        <span className="block text-xs text-gray-400">{job.reference}</span>
                      )}
                    </td>
                    <td className={`py-2.5 whitespace-nowrap tabular-nums ${urgent ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                      {job.deadline ?? t.noDeadline}
                      {left !== null && left >= 0 && left <= 7 && (
                        <span className="block text-xs font-normal">
                          {left === 0 ? t.today : `${t.closingSoon} ${left} ${t.days}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="text-center mt-5">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            {t.showing} {visible.length} {t.of} {filtered.length}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">{t.note}</p>
    </div>
  );
}
