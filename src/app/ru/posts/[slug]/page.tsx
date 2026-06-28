import { getPost, getAllPosts } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

const categoryColors: Record<string, string> = {
  "Еда": "bg-orange-100 text-orange-700",
  "Еда и напитки": "bg-orange-100 text-orange-700",
  "Топливо": "bg-yellow-100 text-yellow-700",
  "Досуг и спорт": "bg-green-100 text-green-700",
  "Услуги": "bg-blue-100 text-blue-700",
};

export async function generateStaticParams() {
  return getAllPosts("ru").map((p) => ({ slug: p.slug }));
}

export default async function PostPageRu({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post;
  try {
    post = await getPost(slug, "ru");
  } catch {
    notFound();
  }

  const badgeColor = categoryColors[post.category] ?? "bg-gray-100 text-gray-600";

  return (
    <article>
      <Link href="/ru/" className="text-sm text-blue-500 hover:underline mb-6 inline-block">
        ← Назад ко всем предложениям
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
            {post.category}
          </span>
          <time className="text-sm text-gray-400">
            {new Date(post.date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3">{post.title}</h1>
        <p className="text-lg text-gray-500">{post.summary}</p>
      </header>

      <div
        className="prose prose-slate max-w-none
          prose-headings:font-bold prose-headings:text-gray-800
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-800
          prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-sm"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
