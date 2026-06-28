import data from "@/data/trending-topics.json";
import Link from "next/link";

export const metadata = {
  title: "Trends Dashboard — deals-blog",
  description: "Internal trend tracker: what's trending in Cyprus and post ideas.",
  robots: "noindex,nofollow",
};

const categoryColors: Record<string, string> = {
  "Fuel & Transport": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Food & Drink": "bg-orange-100 text-orange-800 border-orange-300",
  "Housing & Rent": "bg-blue-100 text-blue-800 border-blue-300",
  "Utilities & Bills": "bg-cyan-100 text-cyan-800 border-cyan-300",
  "Shopping & Retail": "bg-purple-100 text-purple-800 border-purple-300",
  "Entertainment & Leisure": "bg-green-100 text-green-800 border-green-300",
  "Education & Students": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "Health & Pharma": "bg-red-100 text-red-800 border-red-300",
  "Tech & Gadgets": "bg-sky-100 text-sky-800 border-sky-300",
  "Travel & Flights": "bg-teal-100 text-teal-800 border-teal-300",
};

const urgencyColors: Record<string, string> = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-gray-50 border-gray-200 text-gray-600",
};

type TrendItem = {
  title: string;
  source: string;
  link: string | null;
  pubDate: string | null;
};

type Trend = {
  key: string;
  label: string;
  items: TrendItem[];
  postIdeas: string[];
};

type AiSuggestion = {
  title: string;
  category: string;
  why: string;
  urgency: "high" | "medium" | "low";
};

export default function TrendsDashboard() {
  const trends = data.trends as Trend[];
  const aiSuggestions = data.aiSuggestions as AiSuggestion[];
  const updated = new Date(data.updatedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Nicosia",
  });

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📡</span>
          <h1 className="text-2xl font-bold">Cyprus Trends Dashboard</h1>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 font-mono">internal</span>
        </div>
        <p className="text-gray-500 text-sm">
          What&apos;s trending in Cyprus right now — and what posts we could write about it.
          Updated hourly from news RSS feeds.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>Last updated: <strong className="text-gray-600">{updated} (EET)</strong></span>
          <span>{data.totalHeadlines} headlines scraped</span>
          <span>{data.categorisedHeadlines} deal-relevant</span>
          <span>Sources: {data.sources.join(", ")}</span>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <h2 className="text-lg font-bold">AI-Generated Post Ideas</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Claude</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {aiSuggestions.map((s, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${urgencyColors[s.urgency] ?? urgencyColors.low}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm leading-snug">{s.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium border ${urgencyColors[s.urgency]}`}>
                    {s.urgency}
                  </span>
                </div>
                <p className="text-xs opacity-80">{s.why}</p>
                <p className="text-xs mt-1 opacity-60">{s.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends by category */}
      {trends.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">📭</p>
          <p>No trending topics yet. The cron runs every 3 hours — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🔥</span> Trending by Category
          </h2>
          {trends.map((trend) => {
            const color = categoryColors[trend.label] ?? "bg-gray-100 text-gray-700 border-gray-300";
            return (
              <div key={trend.key} className="rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>
                    {trend.label}
                  </span>
                  <span className="text-xs text-gray-400">{trend.items.length} headlines</span>
                </div>

                {/* Headlines */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Trending Headlines</p>
                  <ul className="space-y-1.5">
                    {trend.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-300 shrink-0 mt-0.5">→</span>
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-700 hover:text-blue-600 hover:underline leading-snug"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-gray-700 leading-snug">{item.title}</span>
                        )}
                        <span className="text-gray-300 text-xs shrink-0 ml-auto">{item.source.split(" ").slice(-2).join(" ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Post ideas */}
                {trend.postIdeas.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">💡 Post Ideas</p>
                    <ul className="space-y-1.5">
                      {trend.postIdeas.map((idea, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 text-xs flex items-center justify-center shrink-0 font-bold">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 font-medium">{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link href="/" className="text-sm text-blue-500 hover:underline">← Back to deals</Link>
        <p className="text-xs text-gray-400 mt-3">
          Data from: {data.sources.join(" · ")}.
          Social media (TikTok, Instagram, Facebook) don&apos;t offer public APIs —
          news RSS is a strong proxy for what topics are spreading socially.
          Add <code className="bg-gray-100 px-1 rounded">ANTHROPIC_API_KEY</code> to GitHub secrets for AI-generated post ideas.
        </p>
      </div>
    </div>
  );
}
