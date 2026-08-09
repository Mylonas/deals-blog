"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { PANCYPRUS_PLACE } from "./JobsMap";

// Leaflet touches window at import time, so the map can only load in the
// browser — same treatment as PriceMap on the price pages.
const JobsMap = dynamic(() => import("./JobsMap"), { ssr: false });

type Lang = "en" | "el" | "ru";

/** One town a job is tied to, resolved by scripts/jobs/lib/location.mjs. */
export type JobLocation = {
  name: string;
  district: string;
  districtName: string;
  lat: number;
  lon: number;
};

export type Job = {
  id: string;
  sourceId: string;
  employer: string;
  sector: string;
  district?: string;
  title: string;
  url: string;
  published: string | null;
  deadline: string | null;
  reference: string | null;
  deadlineFrom?: string;
  /** Absent on data scraped before the map was added — treat as unplaced. */
  locations?: JobLocation[];
  locationFrom?: "title" | "employer" | "district" | "pancyprus";
};

export type JobsData = { fetchedAt: string; count: number; jobs: Job[] };

/**
 * Whether a post goes through the ΕΔΥ general written examination before the
 * application, inferred from the title — the source notices carry no explicit
 * flag. It is a Public Service mechanism, so it is only meaningful for the
 * civil-service sector; semi-government bodies, municipalities, universities and
 * research centres run their own procedures.
 *
 *   "required" — a general entry grade whose entry scale does not exceed A8.
 *   "none"     — a senior/promotion post (filled by interview), or a body that
 *                does not use the general exam at all.
 *   "unknown"  — a civil-service post whose title does not reveal the scale;
 *                the applicant must read the notice. Deliberately not guessed.
 */
export type ExamStatus = "required" | "none" | "unknown";

// Promotion and senior first-entry scales are filled through interview, not the
// general written examination — these are the words the notices use for them.
const SENIOR_RE = /ΑΝΩΤΕΡ|ΠΡΩΤΟΣ|ΠΡΩΤΗ|ΔΙΕΥΘΥΝΤ|ΕΦΟΡΟΣ|ΠΡΟΪΣΤΑΜΕΝ/;
// Salary-scale tokens as the notices write them: "Α8", "Κλίμακα Α2-Α5-Α7".
// Greek Alpha or Latin A; we take the lowest number as the entry scale.
const SCALE_RE = /[ΑA]\s?(\d{1,2})/g;

export function classifyExam(job: Pick<Job, "sector" | "title">): ExamStatus {
  if (job.sector !== "civil-service") return "none";
  const title = job.title.toUpperCase();
  if (SENIOR_RE.test(title)) return "none";
  const scales = [...title.matchAll(SCALE_RE)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 16);
  if (scales.length === 0) return "unknown";
  return Math.min(...scales) <= 8 ? "required" : "unknown";
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    total: "open positions", search: "Search position or employer…", any: "All",
    sector: "Sector", employer: "Employer", deadline: "Deadline", position: "Position",
    district: "District",
    sortDeadline: "Closing soonest", sortEmployer: "By employer", sortNewest: "Newest first",
    clear: "Clear filters", none: "No positions match your filters.",
    showing: "Showing", of: "of", updated: "Updated", noDeadline: "—",
    closingSoon: "closes in", days: "days", today: "closes today",
    withDeadline: "With a stated deadline only",
    note: "Positions are listed in Greek, as published by each employer.",
    exam: "Written exam", examRequired: "Exam required first", examNone: "No general exam",
    examUnknown: "Check the notice", examTag: "Exam", checkTag: "Check notice",
    examNote: "“Written exam” is inferred from the title: the Public Service (ΕΔΥ) general written examination applies to general entry grades (entry scale up to A8) and is sat before applying. Senior, promotion and specialised posts are filled by interview. Always confirm in the official notice.",
  },
  el: {
    total: "κενές θέσεις", search: "Αναζήτηση θέσης ή εργοδότη…", any: "Όλα",
    sector: "Τομέας", employer: "Εργοδότης", deadline: "Προθεσμία", position: "Θέση",
    district: "Επαρχία",
    sortDeadline: "Λήγουν σύντομα", sortEmployer: "Ανά εργοδότη", sortNewest: "Νεότερες πρώτα",
    clear: "Καθαρισμός", none: "Καμία θέση με αυτά τα κριτήρια.",
    showing: "Εμφάνιση", of: "από", updated: "Ενημέρωση", noDeadline: "—",
    closingSoon: "λήγει σε", days: "μέρες", today: "λήγει σήμερα",
    withDeadline: "Μόνο με δηλωμένη προθεσμία",
    note: "Οι θέσεις παρατίθενται όπως δημοσιεύονται από κάθε εργοδότη.",
    exam: "Γραπτή εξέταση", examRequired: "Απαιτείται εξέταση πρώτα", examNone: "Χωρίς γενική εξέταση",
    examUnknown: "Βλ. προκήρυξη", examTag: "Εξέταση", checkTag: "Βλ. προκήρυξη",
    examNote: "Η ένδειξη «Γραπτή εξέταση» προκύπτει από τον τίτλο: η γενική γραπτή εξέταση της Επιτροπής Δημόσιας Υπηρεσίας (ΕΔΥ) αφορά γενικές θέσεις εισδοχής (αρχική κλίμακα έως Α8) και προηγείται της αίτησης. Θέσεις ευθύνης, προαγωγής και εξειδικευμένες πληρώνονται με συνέντευξη. Επιβεβαιώνετε πάντα στην επίσημη προκήρυξη.",
  },
  ru: {
    total: "вакансий", search: "Поиск должности или работодателя…", any: "Все",
    sector: "Сектор", employer: "Работодатель", deadline: "Срок подачи", position: "Должность",
    district: "Район",
    sortDeadline: "Скоро закрытие", sortEmployer: "По работодателю", sortNewest: "Сначала новые",
    clear: "Сбросить", none: "Нет вакансий по этим фильтрам.",
    showing: "Показано", of: "из", updated: "Обновлено", noDeadline: "—",
    closingSoon: "до закрытия", days: "дн.", today: "закрывается сегодня",
    withDeadline: "Только с указанным сроком",
    note: "Вакансии приводятся на греческом языке, как их публикует работодатель.",
    exam: "Письменный экзамен", examRequired: "Сначала нужен экзамен", examNone: "Без общего экзамена",
    examUnknown: "См. объявление", examTag: "Экзамен", checkTag: "См. объявление",
    examNote: "Отметка «Письменный экзамен» выводится из названия: общий письменный экзамен Комиссии по госслужбе (ЕДY) касается общих должностей начального уровня (начальная шкала до A8) и сдаётся до подачи заявления. Руководящие, продвиженческие и узкоспециальные должности замещаются по собеседованию. Всегда сверяйтесь с официальным объявлением.",
  },
};

const SECTORS: Record<string, Record<Lang, string>> = {
  "civil-service": { en: "Civil Service", el: "Δημόσια Υπηρεσία", ru: "Госслужба" },
  "semi-government": { en: "Semi-government", el: "Ημικρατικοί", ru: "Полугосударственные" },
  university: { en: "Universities", el: "Πανεπιστήμια", ru: "Университеты" },
  research: { en: "Research Centres", el: "Ερευνητικά Κέντρα", ru: "Научные центры" },
  "district-organisation": { en: "District Organisations", el: "Επαρχιακοί Οργανισμοί", ru: "Районные организации" },
  municipality: { en: "Municipalities", el: "Δήμοι", ru: "Муниципалитеты" },
};

// Key order is the dropdown order: the island-wide bucket first, then the
// districts as the map reads them.
const DISTRICTS: Record<string, Record<Lang, string>> = {
  pancyprus: { en: "Island-wide", el: "Παγκύπρια", ru: "По всему острову" },
  nicosia: { en: "Nicosia", el: "Λευκωσία", ru: "Никосия" },
  limassol: { en: "Limassol", el: "Λεμεσός", ru: "Лимасол" },
  larnaca: { en: "Larnaca", el: "Λάρνακα", ru: "Ларнака" },
  paphos: { en: "Paphos", el: "Πάφος", ru: "Пафос" },
  famagusta: { en: "Famagusta", el: "Αμμόχωστος", ru: "Фамагуста" },
};

const PAGE_SIZE = 40;

function daysUntil(date: string) {
  return Math.round((Date.parse(date) - Date.now()) / 86_400_000);
}

export default function JobsTable({ data, lang }: { data: JobsData; lang: Lang }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [district, setDistrict] = useState("");
  const [employer, setEmployer] = useState("");
  const [exam, setExam] = useState<"" | ExamStatus>("");
  const [datedOnly, setDatedOnly] = useState(false);
  const [sort, setSort] = useState<"deadline" | "employer" | "newest">("deadline");
  const [page, setPage] = useState(1);
  // A town name, PANCYPRUS_PLACE, or null for everywhere. Separate from the
  // district dropdown on purpose: the map narrows to one town, the dropdown to a
  // whole district, and the two are useful together.
  const [place, setPlace] = useState<string | null>(null);

  const selectPlace = (next: string | null) => {
    setPlace((current) => (current === next ? null : next));
    setPage(1);
  };

  const employers = useMemo(
    () => [...new Set(data.jobs.map((j) => j.employer))].sort((a, b) => a.localeCompare(b, "el")),
    [data.jobs],
  );
  // Driven off the label maps rather than the data, so both dropdowns keep a
  // deliberate order instead of whichever employer happened to be scraped first.
  const sectors = useMemo(
    () => Object.keys(SECTORS).filter((s) => data.jobs.some((j) => j.sector === s)),
    [data.jobs],
  );
  const districts = useMemo(
    () => Object.keys(DISTRICTS).filter((d) => data.jobs.some((j) => j.district === d)),
    [data.jobs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = data.jobs.filter((job) => {
      if (sector && job.sector !== sector) return false;
      // Island-wide employers stay visible under every district: an ΕΔΥ
      // competition is open to Larnaca whatever the Commission's own address is.
      if (district && job.district !== district && job.district !== "pancyprus") return false;
      if (employer && job.employer !== employer) return false;
      if (exam && classifyExam(job) !== exam) return false;
      if (datedOnly && !job.deadline) return false;
      // The island-wide chip is the complement of the pins: a post with no town
      // is not shown anywhere on the map, so this is the only way to reach it.
      if (place === PANCYPRUS_PLACE && (job.locations ?? []).length > 0) return false;
      if (place !== null && place !== PANCYPRUS_PLACE && !(job.locations ?? []).some((l) => l.name === place)) return false;
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
  }, [data.jobs, q, sector, district, employer, exam, datedOnly, place, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const reset = () => {
    setQ(""); setSector(""); setDistrict(""); setEmployer(""); setExam(""); setDatedOnly(false); setPlace(null); setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <span className="font-semibold">{filtered.length} {t.total}</span>
        <span className="text-gray-500 dark:text-gray-400">· {t.updated} {data.fetchedAt.slice(0, 10)}</span>
      </div>

      {/* Every job, not `filtered` — the pins are the overview, so they must not
          shrink as the table filters or clicking one would erase the rest. */}
      <JobsMap jobs={data.jobs} place={place} onSelect={selectPlace} lang={lang} />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder={t.search}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 sm:col-span-2 lg:col-span-4"
        />
        <select
          value={district}
          onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">{t.district}: {t.any}</option>
          {districts.map((d) => <option key={d} value={d}>{DISTRICTS[d][lang]}</option>)}
        </select>
        <select
          value={sector}
          onChange={(e) => { setSector(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">{t.sector}: {t.any}</option>
          {sectors.map((s) => <option key={s} value={s}>{SECTORS[s]?.[lang] ?? s}</option>)}
        </select>
        <select
          value={exam}
          onChange={(e) => { setExam(e.target.value as "" | ExamStatus); setPage(1); }}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">{t.exam}: {t.any}</option>
          <option value="required">{t.examRequired}</option>
          <option value="none">{t.examNone}</option>
          <option value="unknown">{t.examUnknown}</option>
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
                const ex = classifyExam(job);
                return (
                  <tr key={job.id} className="border-t border-gray-200 dark:border-gray-800 align-top">
                    <td className="py-2.5 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {job.employer}
                      {job.district && DISTRICTS[job.district] && (
                        <span className="block text-xs text-gray-400">{DISTRICTS[job.district][lang]}</span>
                      )}
                    </td>
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
                      {ex === "required" && (
                        <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {t.examTag}
                        </span>
                      )}
                      {ex === "unknown" && (
                        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {t.checkTag}
                        </span>
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
      <p className="text-xs text-gray-400 mt-2">{t.examNote}</p>
    </div>
  );
}
