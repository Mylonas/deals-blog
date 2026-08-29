import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about DealsHub — a free website that compares prices, deals and public-sector job listings across Cyprus to help you save money.",
  alternates: {
    canonical: "/about/",
    languages: { en: "/about/", el: "/el/about/", ru: "/ru/about/", "x-default": "/about/" },
  },
};

export default function AboutEn() {
  return (
    <article className="max-w-3xl prose-neutral">
      <h1 className="text-3xl font-bold mb-2">About DealsHub</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          DealsHub is a free, independent website built to help people in Cyprus find the best
          prices and save money on everyday essentials. We compare publicly available prices from
          supermarkets, petrol stations, coffee shops and food delivery platforms — all in one place.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">What we cover</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Supermarket product prices across major chains</li>
            <li>Fuel prices from petrol stations island-wide</li>
            <li>Coffee prices from cafés across Cyprus</li>
            <li>Souvlaki prices from restaurants and delivery platforms</li>
            <li>Public-sector job listings from government portals</li>
            <li>Price trends and historical comparisons</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">How it works</h2>
          <p>
            We automatically collect pricing data from publicly available sources on a daily basis.
            This data is compared, ranked and presented in easy-to-read tables and charts so you can
            quickly find the cheapest option near you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Our principles</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>Free forever</strong> — no subscriptions, no paywalls</li>
            <li><strong>Independent</strong> — we are not affiliated with any retailer or brand</li>
            <li><strong>Transparent</strong> — prices come from public sources, updated daily</li>
            <li><strong>Multilingual</strong> — available in English, Greek and Russian</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Who runs this</h2>
          <p>
            DealsHub is a personal project by Michalis Mylonas, a software developer based in Nicosia,
            Cyprus. It started as a simple price-comparison tool and grew into a comprehensive resource
            for everyday savings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Get in touch</h2>
          <p>
            Have a suggestion, found an error, or want to say hello? Email{" "}
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
