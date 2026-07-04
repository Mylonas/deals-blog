import { getPost, getAllPosts } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

const categoryColors: Record<string, string> = {
  "Φαγητό": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Φαγητό & Ποτό": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Καύσιμα": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Ψυχαγωγία & Αθλητισμός": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Υπηρεσίες": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

// Slugs that have dedicated pages — exclude to prevent static export collision
const DEDICATED_SLUGS = ["cheapest-petrol-stations-cyprus", "supermarket-price-watch", "cheapest-supermarket-products"];

export async function generateStaticParams() {
  return getAllPosts("el")
    .filter((p) => !DEDICATED_SLUGS.includes(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export default async function PostPageEl({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post;
  try {
    post = await getPost(slug, "el");
  } catch {
    notFound();
  }

  const badgeColor = categoryColors[post.category] ?? "bg-gray-100 text-gray-600";

  return (
    <article>
      <Link href="/el/" className="text-sm text-blue-500 hover:underline mb-6 inline-block">
        ← Πίσω σε όλες τις προσφορές
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
            {post.category}
          </span>
          <time className="text-sm text-gray-400 dark:text-gray-500">
            {new Date(post.date).toLocaleDateString("el-GR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          {post.updated && post.updated !== post.date && (
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              Ενημερώθηκε{" "}
              {new Date(post.updated).toLocaleDateString("el-GR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3">{post.title}</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">{post.summary}</p>
      </header>

      <div
        className="prose prose-slate max-w-none
          prose-headings:font-bold prose-headings:text-gray-800 dark:prose-headings:text-gray-100
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-800 dark:prose-strong:text-gray-100
          prose-code:bg-gray-100 dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200 prose-code:px-1 prose-code:rounded prose-code:text-sm"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
