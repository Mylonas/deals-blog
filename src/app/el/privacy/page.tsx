import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Πολιτική Απορρήτου",
  description:
    "Πώς η DealsHub διαχειρίζεται δεδομένα, cookies και διαφημίσεις. Δεν συλλέγουμε προσωπικά δεδομένα· η πολιτική καλύπτει και τα cookies τρίτων για διαφημίσεις.",
  alternates: {
    canonical: "/el/privacy/",
    languages: { en: "/privacy/", el: "/el/privacy/", ru: "/ru/privacy/", "x-default": "/privacy/" },
  },
};

export default function PrivacyEl() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Πολιτική Απορρήτου</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Τελευταία ενημέρωση: 10 Αυγούστου 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Η DealsHub (&laquo;εμείς&raquo;) είναι ένας ενημερωτικός ιστότοπος που συγκρίνει δημόσια
          διαθέσιμες τιμές, προσφορές και θέσεις εργασίας του δημόσιου τομέα στην Κύπρο. Η παρούσα
          πολιτική εξηγεί ποια στοιχεία εμπλέκονται όταν επισκέπτεστε τον ιστότοπο.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Πληροφορίες που συλλέγουμε</h2>
          <p>
            Δεν ζητούμε ούτε αποθηκεύουμε προσωπικά δεδομένα. Δεν υπάρχουν λογαριασμοί, εγγραφές ή
            φόρμες επικοινωνίας. Ο πάροχος φιλοξενίας (Cloudflare) επεξεργάζεται τυπικά τεχνικά
            δεδομένα αιτημάτων — όπως διεύθυνση IP και τύπο προγράμματος περιήγησης — για την παροχή
            και προστασία του ιστότοπου.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Cookies και τοπική αποθήκευση</h2>
          <p>
            Χρησιμοποιούμε την τοπική αποθήκευση του προγράμματος περιήγησής σας μόνο για να θυμόμαστε
            τις προτιμήσεις εμφάνισης (φωτεινό ή σκοτεινό θέμα και γλώσσα). Δεν χρησιμοποιούμε δικά μας
            cookies παρακολούθησης.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Διαφημίσεις</h2>
          <p>
            Ενδέχεται μελλοντικά να προβάλλουμε διαφημίσεις μέσω του Google AdSense. Όταν συμβεί αυτό,
            τρίτοι πάροχοι — συμπεριλαμβανομένης της Google — ενδέχεται να χρησιμοποιούν cookies για την
            προβολή διαφημίσεων βάσει προηγούμενων επισκέψεών σας σε αυτόν και σε άλλους ιστότοπους.
          </p>
          <p className="mt-3">
            Μπορείτε να εξαιρεθείτε από την εξατομικευμένη διαφήμιση στις{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Ρυθμίσεις Διαφημίσεων Google</a>, ή από τα
            cookies τρίτων στο{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Σύνδεσμοι προς άλλους ιστότοπους</h2>
          <p>
            Οι καταχωρίσεις προσφορών και θέσεων παραπέμπουν σε εξωτερικούς ιστότοπους (καταστήματα,
            εφαρμογές delivery, κρατικές σελίδες) που έχουν τις δικές τους πολιτικές απορρήτου, τις
            οποίες δεν ελέγχουμε.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Παιδιά</h2>
          <p>Ο ιστότοπος δεν απευθύνεται σε παιδιά κάτω των 16 ετών και δεν συλλέγουμε εν γνώσει μας δεδομένα τους.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Επικοινωνία</h2>
          <p>
            Ερωτήσεις για την πολιτική: <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Αλλαγές</h2>
          <p>Ενδέχεται να ενημερώσουμε την πολιτική· η ημερομηνία παραπάνω δείχνει την πιο πρόσφατη αναθεώρηση.</p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/el" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Πίσω στη DealsHub</Link>
      </div>
    </article>
  );
}
