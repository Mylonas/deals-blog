import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

const categoryColors: Record<string, string> = {
  "Еда": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Еда и напитки": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Топливо": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Досуг и спорт": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Услуги": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Студенческие скидки": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function CategoryBadge({ category }: { category: string }) {
  const color = categoryColors[category] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {category}
    </span>
  );
}

export default function HomeRu() {
  const posts = getAllPosts("ru");
  const pinned = posts.filter((p) => p.pinned);
  const regular = posts.filter((p) => !p.pinned);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Последние предложения</h1>
        <p className="text-gray-500 dark:text-gray-400">Отобранные сравнения, чтобы вы не переплачивали.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📌</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Закреплено</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/ru/posts/supermarket-price-watch"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Еда и напитки</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">В РЕАЛЬНОМ ВРЕМЕНИ ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Мониторинг цен в супермаркетах — 10 основных продуктов
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">Актуальные цены на 10 базовых товаров во всех крупных супермаркетах Кипра с платформы e-Kalathi. Обновляется каждый час.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Читать далее →</div>
          </Link>
          {pinned.map((post) => (
              <Link
                key={post.slug}
                href={`/ru/posts/${post.slug}`}
                className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={post.category} />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">В РЕАЛЬНОМ ВРЕМЕНИ ●</span>
                </div>
                <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{post.summary}</p>
                <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">
                  Читать далее →
                </div>
              </Link>
            ))}
          </div>
        </div>

      {posts.length === 0 && (
        <p className="text-gray-400 text-center py-20">Публикаций пока нет.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {regular.map((post) => (
          <Link
            key={post.slug}
            href={`/ru/posts/${post.slug}`}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <CategoryBadge category={post.category} />
              <time className="text-xs text-gray-400">
                {new Date(post.date).toLocaleDateString("ru-RU", {
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
              Читать далее →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
