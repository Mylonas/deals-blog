import "../app/globals.css";
import type { Metadata } from "next";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import SiteNav from "@/components/SiteNav";
import CookieConsent from "@/components/CookieConsent";
import AdSenseLoader from "@/components/AdSenseLoader";
import { STR, homeHref, pageHref, type Lang } from "@/lib/i18n";

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Mouxti";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Each language group has its own root layout so <html lang> is correct in the
// static HTML (see src/app/(en|el|ru)/layout.tsx).
export function baseMetadata(lang: Lang): Metadata {
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: STR[lang].homeDescription,
    metadataBase: new URL(siteUrl),
    openGraph: { siteName, type: "website", images: [{ url: "/og-default.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: ["/og-default.png"] },
    other: { "google-adsense-account": "ca-pub-4547647290394610" },
  };
}

export default function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const s = STR[lang];
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&d))document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        <a href="#main" className="skip-link">
          {s.skip}
        </a>
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sm:sticky sm:top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 pt-1 pb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <a href={homeHref(lang)} className="flex items-center gap-2 min-h-[44px] rounded-md">
              <span aria-hidden="true" className="text-2xl">🏷️</span>
              <span className="text-xl font-bold tracking-tight">{siteName}</span>
            </a>
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <LangSwitcher />
            </div>
            <SiteNav lang={lang} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-5 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-16 py-8 text-center text-sm text-gray-700 dark:text-gray-300">
          <nav aria-label={s.footerNav} className="mb-3 px-4">
            <ul className="flex flex-wrap justify-center gap-x-2 gap-y-1">
              {(
                [
                  [homeHref(lang), s.home],
                  [pageHref(lang, "about"), s.about],
                  [pageHref(lang, "contact"), s.contact],
                  [pageHref(lang, "privacy"), s.privacy],
                  [pageHref(lang, "terms"), s.terms],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="inline-flex items-center min-h-[44px] px-2 underline-offset-2 hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          © {new Date().getFullYear()} {siteName}
        </footer>
        <CookieConsent />
        <AdSenseLoader />
      </body>
    </html>
  );
}
