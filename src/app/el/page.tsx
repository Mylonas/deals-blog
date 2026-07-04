import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

const categoryColors: Record<string, string> = {
  "Φαγητό": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Φαγητό & Ποτό": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Καύσιμα": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Ψυχαγωγία & Αθλητισμός": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Υπηρεσίες": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Φοιτητικές Προσφορές": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function CategoryBadge({ category }: { category: string }) {
  const color = categoryColors[category] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {category}
    </span>
  );
}

export default function HomeEl() {
  const posts = getAllPosts("el");
  const pinned = posts.filter((p) => p.pinned);
  const regular = posts.filter((p) => !p.pinned);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Τελευταίες Προσφορές</h1>
        <p className="text-gray-500 dark:text-gray-400">Επιλεγμένες συγκρίσεις για να μην πληρώνετε παραπάνω.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📌</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Καρφιτσωμένο</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/el/posts/supermarket-price-watch"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Φαγητό &amp; Ποτό</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">ΖΩΝΤΑΝΑ ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Παρακολούθηση Τιμών Σούπερ Μάρκετ — 10 Βασικά Προϊόντα
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">Ζωντανές τιμές για 10 βασικά οικιακά προϊόντα στα μεγάλα σούπερ μάρκετ της Κύπρου, από το e-Kalathi. Ενημερώνεται κάθε ώρα.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Διαβάστε περισσότερα →</div>
          </Link>
          <Link
            href="/el/posts/cheapest-supermarket-products"
            className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Φαγητό &amp; Ποτό</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">ΖΩΝΤΑΝΑ ●</span>
            </div>
            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              Top 20 Μεγαλύτερες Εκπτώσεις στα Σούπερ Μάρκετ Κύπρου
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">Τα 20 προϊόντα με τις μεγαλύτερες μειώσεις τιμής αυτή τη στιγμή σε όλα τα μεγάλα σούπερ μάρκετ της Κύπρου, από το e-Kalathi. Ενημέρωση καθημερινά.</p>
            <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">Διαβάστε περισσότερα →</div>
          </Link>
          {pinned.map((post) => (
              <Link
                key={post.slug}
                href={`/el/posts/${post.slug}`}
                className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={post.category} />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">ΖΩΝΤΑΝΑ ●</span>
                </div>
                <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{post.summary}</p>
                <div className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline">
                  Διαβάστε περισσότερα →
                </div>
              </Link>
            ))}
          </div>
        </div>

      {posts.length === 0 && (
        <p className="text-gray-400 text-center py-20">Δεν υπάρχουν αναρτήσεις ακόμα.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {regular.map((post) => (
          <Link
            key={post.slug}
            href={`/el/posts/${post.slug}`}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <CategoryBadge category={post.category} />
              <time className="text-xs text-gray-400">
                {new Date(post.date).toLocaleDateString("el-GR", {
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
              Διαβάστε περισσότερα →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
