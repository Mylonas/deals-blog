import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

const categoryColors: Record<string, string> = {
  "Еда": "bg-orange-100 text-orange-700",
  "Еда и напитки": "bg-orange-100 text-orange-700",
  "Топливо": "bg-yellow-100 text-yellow-700",
  "Досуг и спорт": "bg-green-100 text-green-700",
  "Услуги": "bg-blue-100 text-blue-700",
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

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Последние предложения</h1>
        <p className="text-gray-500">Отобранные сравнения, чтобы вы не переплачивали.</p>
      </div>

      {posts.length === 0 && (
        <p className="text-gray-400 text-center py-20">Публикаций пока нет.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/ru/posts/${post.slug}`}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
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
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-sm text-gray-500 line-clamp-3">{post.summary}</p>
            <div className="mt-4 text-xs font-medium text-blue-500 group-hover:underline">
              Читать далее →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
