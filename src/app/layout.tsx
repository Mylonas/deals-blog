import type { Metadata } from "next";
import "./globals.css";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "DealsHub";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: { default: siteName, template: `%s | ${siteName}` },
  description: "The best deals, compared and ranked.",
  metadataBase: new URL(siteUrl),
  openGraph: { siteName, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&d))document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              <span className="text-xl font-bold tracking-tight">DealsHub</span>
            </a>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                Best deals, compared &amp; ranked
              </span>
              <ThemeToggle />
              <LangSwitcher />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-16 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} DealsHub
        </footer>
      </body>
    </html>
  );
}
