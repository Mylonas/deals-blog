import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the DealsHub team. Report errors, suggest improvements or ask questions.",
  alternates: {
    canonical: "/contact/",
    languages: { en: "/contact/", el: "/el/contact/", ru: "/ru/contact/", "x-default": "/contact/" },
  },
};

export default function ContactEn() {
  return (
    <article className="max-w-3xl prose-neutral">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          We&rsquo;d love to hear from you. Whether you have a suggestion, spotted an error in our
          data, or just want to say hello — don&rsquo;t hesitate to reach out.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Email</h2>
          <p>
            The best way to contact us is by email:{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">What you can contact us about</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Incorrect or outdated price data</li>
            <li>Suggestions for new products, shops or features</li>
            <li>Bug reports or website issues</li>
            <li>Business enquiries or partnerships</li>
            <li>General feedback</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Response time</h2>
          <p>
            DealsHub is run by one person, so replies may take a day or two. We read every email and
            do our best to respond promptly.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to DealsHub</Link>
      </div>
    </article>
  );
}
