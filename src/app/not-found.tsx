import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Back to DealsHub
      </Link>
    </div>
  );
}
