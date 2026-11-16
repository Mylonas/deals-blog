import type { Tool } from "./i18n";

// One visual identity per tracker: an inline SVG icon and an accent colour, used on the home
// card, the header bar and the tracker page. Class names are written out in full so Tailwind
// keeps them. Contrast (WCAG AA): the -800 text on its -50 tint is >= 6:1 in light mode and the
// -300 text on the dark surface is >= 9:1 in dark mode; the accent is never the only signal
// (icon + text label always accompany it).
export const ACCENT: Record<Tool, { text: string; card: string; chip: string; ring: string; bar: string }> = {
  fuel: {
    text: "text-blue-800 dark:text-blue-300",
    card: "bg-blue-50 border-blue-200 hover:border-blue-500 dark:bg-blue-950/40 dark:border-blue-900 dark:hover:border-blue-500",
    chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    ring: "focus-visible:outline-blue-700",
    bar: "border-blue-600",
  },
  supermarket: {
    text: "text-emerald-800 dark:text-emerald-300",
    card: "bg-emerald-50 border-emerald-200 hover:border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-900 dark:hover:border-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    ring: "focus-visible:outline-emerald-700",
    bar: "border-emerald-600",
  },
  coffee: {
    text: "text-amber-800 dark:text-amber-300",
    card: "bg-amber-50 border-amber-200 hover:border-amber-500 dark:bg-amber-950/40 dark:border-amber-900 dark:hover:border-amber-500",
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
    ring: "focus-visible:outline-amber-700",
    bar: "border-amber-600",
  },
  souvlaki: {
    text: "text-rose-800 dark:text-rose-300",
    card: "bg-rose-50 border-rose-200 hover:border-rose-500 dark:bg-rose-950/40 dark:border-rose-900 dark:hover:border-rose-500",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    ring: "focus-visible:outline-rose-700",
    bar: "border-rose-600",
  },
  jobs: {
    text: "text-violet-800 dark:text-violet-300",
    card: "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900",
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    ring: "focus-visible:outline-violet-700",
    bar: "border-violet-600",
  },
};

const PATHS: Record<Tool, React.ReactNode> = {
  fuel: <path d="M4 20V6a2 2 0 012-2h6a2 2 0 012 2v14M3 20h12M14 10h2a2 2 0 012 2v4a1.5 1.5 0 003 0V9l-3-3M7 8h4" />,
  supermarket: (
    <>
      <path d="M3 4h2l2.4 10.2a1 1 0 001 .8h8.2a1 1 0 001-.8L19 8H6" />
      <circle cx="9" cy="19.5" r="1" />
      <circle cx="17" cy="19.5" r="1" />
    </>
  ),
  coffee: <path d="M5 8h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4V8zM16 9h1.5a2.5 2.5 0 010 5H16M8 3v2M12 3v2" />,
  souvlaki: (
    <>
      <path d="M4 20L20 4" />
      <rect x="6.5" y="11.5" width="4" height="4" rx="1" transform="rotate(-45 8.5 13.5)" />
      <rect x="10.5" y="7.5" width="4" height="4" rx="1" transform="rotate(-45 12.5 9.5)" />
      <rect x="14.5" y="3.5" width="3.5" height="3.5" rx="1" transform="rotate(-45 16.2 5.2)" />
    </>
  ),
  jobs: <path d="M4 8h16v11H4zM9 8V5h6v3" />,
};

export function ToolIcon({ tool, className = "w-6 h-6" }: { tool: Tool; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[tool]}
    </svg>
  );
}
