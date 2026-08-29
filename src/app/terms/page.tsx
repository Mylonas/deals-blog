import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing the use of DealsHub — a free informational website comparing prices, deals and public-sector job listings in Cyprus.",
  alternates: {
    canonical: "/terms/",
    languages: { en: "/terms/", el: "/el/terms/", ru: "/ru/terms/", "x-default": "/terms/" },
  },
};

export default function TermsEn() {
  return (
    <article className="max-w-3xl prose-neutral">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: 29 August 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Welcome to DealsHub. By accessing or using the website you agree to the following terms.
          If you do not agree, please do not use the site.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">What we provide</h2>
          <p>
            DealsHub is a free informational website that aggregates and compares publicly available
            prices, deals and public-sector job listings in Cyprus. All content is provided
            &ldquo;as is&rdquo; for general informational purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Accuracy</h2>
          <p>
            We make reasonable efforts to keep prices and listings up to date, but we do not guarantee
            their accuracy, completeness or timeliness. Prices are sourced from third-party websites
            and may change without notice. Always verify with the retailer or official source before
            making a purchasing decision.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">External links</h2>
          <p>
            The site contains links to external websites (retailers, delivery platforms, government
            portals). We are not responsible for the content, availability or practices of those sites.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Intellectual property</h2>
          <p>
            Original content, design and code on DealsHub are the property of the site owner. Product
            names, logos and trademarks mentioned on the site belong to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Limitation of liability</h2>
          <p>
            DealsHub and its operator are not liable for any direct, indirect or consequential damages
            arising from your use of the site or reliance on its content. Use the information at your
            own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Advertising</h2>
          <p>
            The site may display third-party advertisements served by Google AdSense. These ads may
            use cookies; see our{" "}
            <Link href="/privacy/" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Changes</h2>
          <p>
            We may update these terms at any time. Continued use of the site after changes constitutes
            acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to DealsHub</Link>
      </div>
    </article>
  );
}
