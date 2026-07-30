import JobsTable, { type JobsData } from "@/components/JobsTable";
import data from "@/data/public-jobs.json";
import Link from "next/link";

export const metadata = {
  title: "Cyprus Public Sector Jobs — Live Vacancies",
  description:
    "Every open public-sector vacancy in Cyprus in one place: the civil service (ΕΔΥ), semi-government organisations, the five district organisations and all 20 municipalities.",
};

export default function PublicJobsEN() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Jobs
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">LIVE ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Cyprus Public Sector Jobs</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Every open public-sector vacancy in Cyprus, gathered from 43 official sources:
        the civil service competitions published by the ΕΔΥ, the semi-government
        organisations (Cyta, ΑΗΚ, Αρχή Λιμένων, ΟΚΥπΥ, the universities), the five
        district organisations and all 20 municipalities. Closing dates are read from
        the official notices themselves. Last refreshed{" "}
        {new Date(data.fetchedAt).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric",
        })}.
      </p>

      <JobsTable data={data as unknown as JobsData} lang="en" />

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        The legally binding source is always the Επίσημη Εφημερίδα της Δημοκρατίας,
        published most Fridays. Always check the official notice before applying.
      </p>

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/" className="text-sm text-blue-500 hover:underline">← Back to all deals</Link>
      </div>
    </article>
  );
}
