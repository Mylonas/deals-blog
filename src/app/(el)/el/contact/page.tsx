import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import Link from "next/link";

export const metadata = pageMeta({ lang: "el", path: "contact", ...PAGES.contact.el });

export default function ContactEl() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Επικοινωνία</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          Θα χαρούμε να ακούσουμε τη γνώμη σας. Είτε έχετε μια πρόταση, εντοπίσατε κάποιο σφάλμα
          στα δεδομένα μας, ή απλά θέλετε να πείτε ένα γεια — μη διστάσετε να επικοινωνήσετε.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Email</h2>
          <p>
            Ο καλύτερος τρόπος επικοινωνίας είναι μέσω email:{" "}
            <a className="text-blue-700 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Για τι μπορείτε να επικοινωνήσετε</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Λανθασμένα ή ξεπερασμένα δεδομένα τιμών</li>
            <li>Προτάσεις για νέα προϊόντα, καταστήματα ή λειτουργίες</li>
            <li>Αναφορές σφαλμάτων ή προβλήματα ιστότοπου</li>
            <li>Επαγγελματικές ερωτήσεις ή συνεργασίες</li>
            <li>Γενικά σχόλια</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Χρόνος απάντησης</h2>
          <p>
            Το Mouxti λειτουργεί από ένα άτομο, οπότε οι απαντήσεις μπορεί να χρειαστούν μια-δύο
            μέρες. Διαβάζουμε κάθε email και κάνουμε ό,τι μπορούμε να απαντήσουμε γρήγορα.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/el/" className="text-sm text-blue-700 dark:text-blue-400 hover:underline">&larr; Πίσω στο Mouxti</Link>
      </div>
    </article>
  );
}
