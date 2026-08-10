import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DealsHub handles data, cookies and advertising. We collect no personal data; this policy also covers third-party ad cookies.",
  alternates: {
    canonical: "/privacy/",
    languages: { en: "/privacy/", el: "/el/privacy/", ru: "/ru/privacy/", "x-default": "/privacy/" },
  },
};

export default function PrivacyEn() {
  return (
    <article className="max-w-3xl prose-neutral">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: 10 August 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          DealsHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an informational website that compares publicly
          available prices, deals and public-sector job listings in Cyprus. This policy explains what
          information is involved when you visit the site.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Information we collect</h2>
          <p>
            We do not ask for or store personal data. There are no accounts, sign-ups or contact forms.
            Our hosting provider (Cloudflare) processes standard technical request data — such as IP
            address and browser type — to deliver the site and protect it from abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Cookies and local storage</h2>
          <p>
            We use your browser&rsquo;s local storage only to remember your display preferences (light
            or dark theme and language). We do not set our own tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Advertising</h2>
          <p>
            We may display advertising through Google AdSense in the future. When we do, third-party
            vendors — including Google — may use cookies to serve ads based on your prior visits to this
            and other websites. Google&rsquo;s use of advertising cookies enables it and its partners to
            serve ads based on your visit here and elsewhere on the internet.
          </p>
          <p className="mt-3">
            You can opt out of personalised advertising in{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt out of
            third-party vendor cookies at{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Links to other websites</h2>
          <p>
            Deal and job listings link to external sites (retailers, delivery apps, government pages).
            Those sites have their own privacy policies, which we do not control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Children</h2>
          <p>The site is not directed at children under 16 and we do not knowingly collect their data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p>
            Questions about this policy: <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Changes</h2>
          <p>We may update this policy; the date above shows the latest revision.</p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to DealsHub</Link>
      </div>
    </article>
  );
}
