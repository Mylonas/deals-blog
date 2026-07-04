import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

const categoryColors: Record<string, string> = {
  Food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Food & Drink": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Fuel: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Entertainment & Leisure": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Utilities & Services": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Student Deals": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  Tech: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Shopping: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

function CategoryBadge({ category }: { category: string }) {
  const color = categoryColors[category] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {category}
    </span>
  );
}

export default function Home() {
  const posts = getAllPosts("en");
  const pinned = posts.filter((p) => p.pinned);
  const regular = posts.filter((p) => !p.pinned);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Latest Deals</h1>
        <p className="text-gray-500 dark:text-gray-400">Hand-picked comparisons so you don&apos;t overpay.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📌</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pinned</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/posts/supermarket-price-watch"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Food &amp; Drink</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">LIVE ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Cyprus Supermarket Price Watch — 10 Household Staples
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">Live prices for the 10 most-bought household products in Cyprus, sourced from the government&apos;s e-Kalathi platform. Updated hourly.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Read more →</div>
          </Link>
          <Link
            href="/posts/cheapest-souvlaki-cyprus"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Food &amp; Drink</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">LIVE ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Cheapest Souvlaki in Cyprus — by City
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">Pork, chicken, pork chop and mix pita prices in every Cyprus city, always sorted cheapest first — with a near-me button. Updated weekly.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Read more →</div>
          </Link>
          <Link
            href="/posts/cheapest-supermarket-products"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Food &amp; Drink</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">LIVE ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Top 20 Biggest Savings at Cyprus Supermarkets
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">The 20 products with the biggest price cuts right now across all major Cyprus supermarkets, from the government&apos;s e-Kalathi price observatory. Updated daily.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Read more →</div>
          </Link>
          {pinned.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={post.category} />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">LIVE ●</span>
                </div>
                <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{post.summary}</p>
                <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">
                  Read more →
                </div>
              </Link>
            ))}
          </div>
        </div>

      {posts.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-center py-20">No posts yet.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {regular.map((post) => (
          <Link
            key={post.slug}
            href={`/posts/${post.slug}`}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <CategoryBadge category={post.category} />
              <time className="text-xs text-gray-400">
                {new Date(post.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{post.summary}</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">
              Read more →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
