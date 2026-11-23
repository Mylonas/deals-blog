import type { Lang, Tool } from "@/lib/i18n";

// Short visible FAQ per tracker. Every answer restates the methodology already stated on the
// page and in the update scripts (sources, refresh cadence, price type); the same text is
// emitted as FAQPage JSON-LD, so visible content and structured data always match.
export type Faq = { q: string; a: string };

export const FAQ_TITLE: Record<Lang, string> = {
  en: "Frequently asked questions",
  el: "Συχνές ερωτήσεις",
  ru: "Частые вопросы",
};

export const FAQ: Partial<Record<Tool, Record<Lang, Faq[]>>> = {
  fuel: {
    en: [
      { q: "Where do the petrol prices come from?", a: "From the Cyprus government's Petroleum Prices portal, the official fuel price observatory. Mouxti only sorts and compares what the portal publishes." },
      { q: "How often are the fuel prices updated?", a: "They are refreshed by hand from the government portal, so they are not live. The page shows the date of the latest data and says so when that data is more than 3 days old." },
      { q: "How do I find the cheapest petrol near me?", a: "Choose a fuel type (Unleaded 95, Unleaded 98 or Diesel) and a district (Nicosia, Limassol, Larnaca, Paphos or Famagusta). Stations are listed cheapest first." },
    ],
    el: [
      { q: "Από πού προέρχονται οι τιμές βενζίνης;", a: "Από το Παρατηρητήριο Τιμών Πετρελαιοειδών της Κυπριακής Κυβέρνησης, το επίσημο παρατηρητήριο τιμών καυσίμων. Το Mouxti απλώς ταξινομεί και συγκρίνει όσα δημοσιεύει." },
      { q: "Πόσο συχνά ενημερώνονται οι τιμές καυσίμων;", a: "Ενημερώνονται χειροκίνητα από την κυβερνητική πύλη, άρα δεν είναι ζωντανές. Η σελίδα δείχνει την ημερομηνία των τελευταίων δεδομένων και το λέει όταν είναι παλαιότερα από 3 ημέρες." },
      { q: "Πώς βρίσκω τη φθηνότερη βενζίνη κοντά μου;", a: "Επιλέξτε τύπο καυσίμου (Αμόλυβδη 95, Αμόλυβδη 98 ή Πετρέλαιο Κίνησης) και επαρχία (Λευκωσία, Λεμεσός, Λάρνακα, Πάφος ή Αμμόχωστος). Τα πρατήρια εμφανίζονται με το φθηνότερο πρώτο." },
    ],
    ru: [
      { q: "Откуда берутся цены на бензин?", a: "Из портала цен на нефтепродукты правительства Кипра, официальной службы наблюдения за ценами на топливо. Mouxti только сортирует и сравнивает то, что публикует портал." },
      { q: "Как часто обновляются цены на топливо?", a: "Они обновляются вручную с правительственного портала, то есть не в реальном времени. На странице указана дата последних данных, и там сказано, если они старше 3 дней." },
      { q: "Как найти самый дешёвый бензин рядом?", a: "Выберите вид топлива (Unleaded 95, Unleaded 98 или дизель) и округ (Никосия, Лимассол, Ларнака, Пафос или Фамагуста). Заправки показаны от самой дешёвой." },
    ],
  },
  supermarket: {
    en: [
      { q: "Where do the supermarket prices come from?", a: "From e-Kalathi, the Cyprus government's price observatory for supermarket products." },
      { q: "How often is the supermarket list updated?", a: "Once a day. The page shows the date of the latest data and says so when it is more than 36 hours old." },
      { q: "How are the top 20 products chosen?", a: "Products are ranked by the size of the drop in their lowest price, biggest drop first, and the list shows the 20 at the top." },
    ],
    el: [
      { q: "Από πού προέρχονται οι τιμές των σούπερ μάρκετ;", a: "Από το e-Kalathi, το παρατηρητήριο τιμών προϊόντων σούπερ μάρκετ της Κυπριακής Κυβέρνησης." },
      { q: "Πόσο συχνά ενημερώνεται η λίστα;", a: "Μία φορά την ημέρα. Η σελίδα δείχνει την ημερομηνία των τελευταίων δεδομένων και το λέει όταν είναι παλαιότερα από 36 ώρες." },
      { q: "Πώς επιλέγονται τα 20 κορυφαία προϊόντα;", a: "Τα προϊόντα κατατάσσονται με βάση το μέγεθος της πτώσης της χαμηλότερης τιμής τους, με τη μεγαλύτερη πτώση πρώτη, και η λίστα δείχνει τα 20 πρώτα." },
    ],
    ru: [
      { q: "Откуда берутся цены в супермаркетах?", a: "Из e-Kalathi, государственной службы наблюдения за ценами на товары в супермаркетах Кипра." },
      { q: "Как часто обновляется список?", a: "Раз в день. На странице указана дата последних данных, и там сказано, если они старше 36 часов." },
      { q: "Как выбираются 20 лучших товаров?", a: "Товары ранжируются по величине снижения их минимальной цены, сначала самое большое снижение, и в списке показаны первые 20." },
    ],
  },
  coffee: {
    en: [
      { q: "Where do the freddo espresso prices come from?", a: "From the Wolt, Bolt Food and Foody delivery platforms. Each price is the cheapest of the three for that café." },
      { q: "How often are the coffee prices updated?", a: "Every two days. The page shows the date of the latest data." },
      { q: "Are these the prices I pay at the counter?", a: "Not always. They are regular (not promo) delivery-platform prices, which may include a platform markup over the counter price." },
    ],
    el: [
      { q: "Από πού προέρχονται οι τιμές του freddo espresso;", a: "Από τις πλατφόρμες Wolt, Bolt Food και Foody. Κάθε τιμή είναι η φθηνότερη από τις τρεις για το συγκεκριμένο καφέ." },
      { q: "Πόσο συχνά ενημερώνονται οι τιμές καφέ;", a: "Κάθε δύο ημέρες. Η σελίδα δείχνει την ημερομηνία των τελευταίων δεδομένων." },
      { q: "Είναι αυτές οι τιμές του ταμείου;", a: "Όχι πάντα. Είναι κανονικές τιμές πλατφορμών delivery (όχι προσφοράς), που μπορεί να περιλαμβάνουν επιβάρυνση της πλατφόρμας σε σχέση με την τιμή στο κατάστημα." },
    ],
    ru: [
      { q: "Откуда берутся цены на фредо эспрессо?", a: "С платформ доставки Wolt, Bolt Food и Foody. Для каждого кафе показана самая низкая из трёх цен." },
      { q: "Как часто обновляются цены на кофе?", a: "Раз в два дня. На странице указана дата последних данных." },
      { q: "Это цены, которые я заплачу на кассе?", a: "Не всегда. Это обычные (не акционные) цены платформ доставки, в них может входить наценка платформы к цене в заведении." },
    ],
  },
  souvlaki: {
    en: [
      { q: "Where do the souvlaki prices come from?", a: "From the Wolt, Bolt and Foody delivery platforms. Each price is the cheapest of the three for that place." },
      { q: "How often are the souvlaki prices updated?", a: "Every two days. The page shows the date of the latest data." },
      { q: "Which pita size is compared?", a: "The regular Cypriot pitta. Greek, Arabic, mini and half pittas are left out, and prices are regular (not promo) prices that may include a platform markup." },
    ],
    el: [
      { q: "Από πού προέρχονται οι τιμές του σουβλακιού;", a: "Από τις πλατφόρμες Wolt, Bolt και Foody. Κάθε τιμή είναι η φθηνότερη από τις τρεις για το συγκεκριμένο μαγαζί." },
      { q: "Πόσο συχνά ενημερώνονται οι τιμές σουβλακιού;", a: "Κάθε δύο ημέρες. Η σελίδα δείχνει την ημερομηνία των τελευταίων δεδομένων." },
      { q: "Ποιο μέγεθος πίτας συγκρίνεται;", a: "Η κανονική κυπριακή πίτα. Η ελληνική, η αραβική, η μίνι και η μισή πίτα αποκλείονται, και οι τιμές είναι κανονικές (όχι προσφοράς) και μπορεί να περιλαμβάνουν επιβάρυνση πλατφόρμας." },
    ],
    ru: [
      { q: "Откуда берутся цены на сувлаки?", a: "С платформ доставки Wolt, Bolt и Foody. Для каждого заведения показана самая низкая из трёх цен." },
      { q: "Как часто обновляются цены на сувлаки?", a: "Раз в два дня. На странице указана дата последних данных." },
      { q: "Какой размер питы сравнивается?", a: "Обычная кипрская пита. Греческая, арабская, мини и половинная пита не учитываются, цены обычные (не акционные) и могут включать наценку платформы." },
    ],
  },
};
