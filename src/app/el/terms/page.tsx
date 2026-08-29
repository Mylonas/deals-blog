import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Όροι Χρήσης",
  description:
    "Όροι που διέπουν τη χρήση του DealsHub — δωρεάν ενημερωτικός ιστότοπος σύγκρισης τιμών, προσφορών και θέσεων δημόσιου τομέα στην Κύπρο.",
  alternates: {
    canonical: "/el/terms/",
    languages: { en: "/terms/", el: "/el/terms/", ru: "/ru/terms/", "x-default": "/terms/" },
  },
};

export default function TermsEl() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Όροι Χρήσης</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Τελευταία ενημέρωση: 29 Αυγούστου 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Καλώς ήρθατε στο DealsHub. Χρησιμοποιώντας τον ιστότοπο αποδέχεστε τους παρακάτω όρους.
          Αν δεν συμφωνείτε, παρακαλούμε μην χρησιμοποιείτε τον ιστότοπο.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Τι παρέχουμε</h2>
          <p>
            Το DealsHub είναι ένας δωρεάν ενημερωτικός ιστότοπος που συγκεντρώνει και συγκρίνει
            δημόσια διαθέσιμες τιμές, προσφορές και θέσεις εργασίας δημόσιου τομέα στην Κύπρο.
            Όλο το περιεχόμενο παρέχεται «ως έχει» για γενική ενημέρωση.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Ακρίβεια</h2>
          <p>
            Καταβάλλουμε εύλογες προσπάθειες για να διατηρούμε τις τιμές και τις καταχωρήσεις
            ενημερωμένες, αλλά δεν εγγυόμαστε την ακρίβεια, πληρότητα ή επικαιρότητά τους. Οι
            τιμές προέρχονται από ιστότοπους τρίτων και μπορεί να αλλάξουν χωρίς ειδοποίηση.
            Επαληθεύετε πάντα με τον λιανοπωλητή ή την επίσημη πηγή.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Εξωτερικοί σύνδεσμοι</h2>
          <p>
            Ο ιστότοπος περιέχει συνδέσμους προς εξωτερικούς ιστότοπους (λιανοπωλητές, πλατφόρμες
            παράδοσης, κυβερνητικές ιστοσελίδες). Δεν ευθυνόμαστε για το περιεχόμενο, τη
            διαθεσιμότητα ή τις πρακτικές αυτών.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Πνευματική ιδιοκτησία</h2>
          <p>
            Το πρωτότυπο περιεχόμενο, ο σχεδιασμός και ο κώδικας του DealsHub ανήκουν στον ιδιοκτήτη
            του ιστότοπου. Τα ονόματα προϊόντων, τα λογότυπα και τα εμπορικά σήματα ανήκουν στους
            αντίστοιχους ιδιοκτήτες τους.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Περιορισμός ευθύνης</h2>
          <p>
            Το DealsHub και ο διαχειριστής του δεν ευθύνονται για τυχόν άμεσες, έμμεσες ή
            παρεπόμενες ζημιές που προκύπτουν από τη χρήση του ιστότοπου ή την εξάρτηση από
            το περιεχόμενό του. Χρησιμοποιείτε τις πληροφορίες με δική σας ευθύνη.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Διαφήμιση</h2>
          <p>
            Ο ιστότοπος μπορεί να εμφανίζει διαφημίσεις τρίτων μέσω Google AdSense. Αυτές οι
            διαφημίσεις ενδέχεται να χρησιμοποιούν cookies· δείτε την{" "}
            <Link href="/el/privacy/" className="text-blue-600 dark:text-blue-400 hover:underline">Πολιτική Απορρήτου</Link>{" "}
            μας για λεπτομέρειες.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Αλλαγές</h2>
          <p>
            Μπορούμε να ενημερώσουμε αυτούς τους όρους ανά πάσα στιγμή. Η συνέχιση της χρήσης
            του ιστότοπου μετά τις αλλαγές αποτελεί αποδοχή.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Επικοινωνία</h2>
          <p>
            Ερωτήσεις σχετικά με αυτούς τους όρους:{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/el/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Πίσω στο DealsHub</Link>
      </div>
    </article>
  );
}
