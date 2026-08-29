import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Σχετικά",
  description:
    "Μάθετε για το DealsHub — δωρεάν ιστότοπο σύγκρισης τιμών, προσφορών και θέσεων δημόσιου τομέα στην Κύπρο.",
  alternates: {
    canonical: "/el/about/",
    languages: { en: "/about/", el: "/el/about/", ru: "/ru/about/", "x-default": "/about/" },
  },
};

export default function AboutEl() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Σχετικά με το DealsHub</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          Το DealsHub είναι ένας δωρεάν, ανεξάρτητος ιστότοπος που βοηθά τους κατοίκους της Κύπρου
          να βρίσκουν τις καλύτερες τιμές και να εξοικονομούν χρήματα στα καθημερινά τους έξοδα.
          Συγκρίνουμε δημόσια διαθέσιμες τιμές από σούπερ μάρκετ, πρατήρια καυσίμων, καφετέριες
          και πλατφόρμες παράδοσης φαγητού — όλα σε ένα μέρος.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Τι καλύπτουμε</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Τιμές προϊόντων σούπερ μάρκετ σε μεγάλες αλυσίδες</li>
            <li>Τιμές καυσίμων σε πρατήρια σε όλη την Κύπρο</li>
            <li>Τιμές καφέ σε καφετέριες σε όλη την Κύπρο</li>
            <li>Τιμές σουβλακιών από εστιατόρια και πλατφόρμες παράδοσης</li>
            <li>Θέσεις εργασίας δημόσιου τομέα από κυβερνητικές πύλες</li>
            <li>Τάσεις τιμών και ιστορικές συγκρίσεις</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Πώς λειτουργεί</h2>
          <p>
            Συλλέγουμε αυτόματα δεδομένα τιμών από δημόσια διαθέσιμες πηγές σε καθημερινή βάση.
            Τα δεδομένα συγκρίνονται, κατατάσσονται και παρουσιάζονται σε εύκολα αναγνώσιμους
            πίνακες και γραφήματα ώστε να βρίσκετε γρήγορα την πιο οικονομική επιλογή κοντά σας.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Οι αρχές μας</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>Δωρεάν για πάντα</strong> — χωρίς συνδρομές, χωρίς περιορισμούς</li>
            <li><strong>Ανεξάρτητο</strong> — δεν συνδεόμαστε με κανέναν λιανοπωλητή ή brand</li>
            <li><strong>Διαφανές</strong> — οι τιμές προέρχονται από δημόσιες πηγές, ενημερώνονται καθημερινά</li>
            <li><strong>Πολύγλωσσο</strong> — διαθέσιμο σε Αγγλικά, Ελληνικά και Ρωσικά</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Ποιος το διαχειρίζεται</h2>
          <p>
            Το DealsHub είναι ένα προσωπικό έργο του Μιχάλη Μυλωνά, προγραμματιστή λογισμικού
            με έδρα τη Λευκωσία, Κύπρο. Ξεκίνησε ως ένα απλό εργαλείο σύγκρισης τιμών και
            εξελίχθηκε σε μια ολοκληρωμένη πηγή καθημερινής εξοικονόμησης.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Επικοινωνία</h2>
          <p>
            Έχετε πρόταση, βρήκατε κάποιο σφάλμα ή θέλετε να πείτε ένα γεια; Email{" "}
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
