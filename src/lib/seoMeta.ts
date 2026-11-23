import type { Lang } from "@/lib/i18n";

// Final <title> (brand included, <= 60 chars) and meta description (<= 155 chars)
// for every indexable page, in every language. Checked by a length script after build.
type Page = { title: string; description: string };
export type PageKey = "home" | "fuel" | "supermarket" | "coffee" | "souvlaki" | "blackFriday" | "about" | "contact" | "privacy" | "terms";

export const PAGES: Record<PageKey, Record<Lang, Page>> = {
  home: {
    en: {
      title: "Cyprus Price Trackers: Petrol, Coffee, Souvlaki | Mouxti",
      description: "Cyprus price trackers: cheapest petrol and diesel, supermarket price cuts, freddo espresso and souvlaki prices by city. Every price shows its date.",
    },
    el: {
      title: "Τιμές Κύπρος: Βενζίνη, Σούπερ Μάρκετ, Καφές | Mouxti",
      description: "Τιμές στην Κύπρο: φθηνότερη βενζίνη και πετρέλαιο, εκπτώσεις σούπερ μάρκετ, φρέντο εσπρέσο και σουβλάκι ανά πόλη. Κάθε τιμή έχει ημερομηνία.",
    },
    ru: {
      title: "Цены на Кипре: бензин, супермаркеты, кофе | Mouxti",
      description: "Цены на Кипре: дешёвый бензин и дизель, скидки в супермаркетах, фредо эспрессо и сувлаки по городам. У каждой цены есть дата.",
    },
  },
  fuel: {
    en: {
      title: "Petrol Prices Cyprus Today: Cheapest Stations | Mouxti",
      description: "Petrol prices in Cyprus today: Unleaded 95, 98 and diesel at every station. Find the cheapest petrol by district. Data from the government fuel portal.",
    },
    el: {
      title: "Τιμές Βενζίνης Κύπρος Σήμερα: Φθηνότερα Πρατήρια | Mouxti",
      description: "Τιμές βενζίνης στην Κύπρο σήμερα: Αμόλυβδη 95, 98 και πετρέλαιο σε κάθε πρατήριο. Βρείτε τη φθηνότερη βενζίνη σε Λευκωσία και άλλες επαρχίες.",
    },
    ru: {
      title: "Цены на бензин Кипр сегодня: дешёвые АЗС | Mouxti",
      description: "Цены на бензин на Кипре сегодня: Unleaded 95, 98 и дизель на каждой АЗС. Найдите самый дешёвый бензин на Кипре по округам. Данные портала правительства.",
    },
  },
  supermarket: {
    en: {
      title: "Cyprus Supermarket Price Cuts: Top 20 Deals | Mouxti",
      description: "The 20 biggest supermarket price cuts in Cyprus, from the government's e-Kalathi price observatory. Refreshed daily, every price dated.",
    },
    el: {
      title: "Εκπτώσεις Σούπερ Μάρκετ Κύπρος: Top 20 | Mouxti",
      description: "Οι 20 μεγαλύτερες μειώσεις τιμών στα σούπερ μάρκετ της Κύπρου, από το επίσημο παρατηρητήριο e-Kalathi. Ενημέρωση καθημερινά, κάθε τιμή με ημερομηνία.",
    },
    ru: {
      title: "Скидки в супермаркетах Кипра: топ-20 | Mouxti",
      description: "Топ-20 крупнейших снижений цен в супермаркетах Кипра по данным портала e-Kalathi. Обновляется ежедневно, у каждой цены есть дата.",
    },
  },
  coffee: {
    en: {
      title: "Freddo Espresso Price Cyprus: Cheapest by City | Mouxti",
      description: "Freddo espresso price in Cyprus: the cheapest cafés in Nicosia, Limassol, Larnaca, Paphos and Ayia Napa. Updated every two days from Wolt, Bolt and Foody.",
    },
    el: {
      title: "Freddo Espresso Τιμή Κύπρος: Φθηνότερος ανά Πόλη | Mouxti",
      description: "Τιμή freddo espresso στην Κύπρο: οι φθηνότερες καφετέριες σε Λευκωσία, Λεμεσό, Λάρνακα, Πάφο, Αγία Νάπα. Ενημέρωση κάθε δύο ημέρες από Wolt, Bolt, Foody.",
    },
    ru: {
      title: "Цена фредо эспрессо Кипр: дешевле всего | Mouxti",
      description: "Цена фредо эспрессо на Кипре: самые дешёвые кафе в Никосии, Лимасоле, Ларнаке, Пафосе, Айя-Напе. Обновление раз в два дня: Wolt, Bolt и Foody.",
    },
  },
  souvlaki: {
    en: {
      title: "Souvlaki Price Cyprus: Cheapest Pita by City | Mouxti",
      description: "Souvlaki price in Cyprus: the cheapest pita in Nicosia, Limassol, Larnaca, Paphos and Ayia Napa. Updated every two days from Wolt, Bolt and Foody.",
    },
    el: {
      title: "Τιμή Σουβλάκι Κύπρος: Φθηνότερο ανά Πόλη | Mouxti",
      description: "Τιμή σουβλάκι στην Κύπρο: η φθηνότερη πίτα σε Λευκωσία, Λεμεσό, Λάρνακα, Πάφο και Αγία Νάπα. Ενημέρωση κάθε δύο ημέρες από Wolt, Bolt και Foody.",
    },
    ru: {
      title: "Цена сувлаки на Кипре: самые дешёвые | Mouxti",
      description: "Цена сувлаки на Кипре: самая дешёвая пита в Никосии, Лимасоле, Ларнаке, Пафосе и Айя-Напе. Обновление раз в два дня: Wolt, Bolt и Foody.",
    },
  },
  blackFriday: {
    en: {
      title: "Black Friday Cyprus 2026: Checked Offers | Mouxti",
      description: "Black Friday Cyprus 2026 offers we checked on the stores' own pages: Electroline, Skroutz, Cyta and more, with dates and sources.",
    },
    el: {
      title: "Black Friday Κύπρος 2026: Ελεγμένες Προσφορές | Mouxti",
      description: "Προσφορές Black Friday Κύπρος 2026 που ελέγξαμε στις σελίδες των καταστημάτων: Electroline, Skroutz, Cyta και άλλα, με ημερομηνίες και πηγές.",
    },
    ru: {
      title: "Black Friday Кипр 2026: проверенные предложения | Mouxti",
      description: "Black Friday 2026 на Кипре: предложения, проверенные на страницах магазинов: Electroline, Skroutz, Cyta и другие, с датами и источниками.",
    },
  },
  about: {
    en: {
      title: "About Mouxti: Free Cyprus Price Comparison",
      description: "About Mouxti: a free, independent site that compares petrol, coffee and souvlaki prices across Cyprus, with every price dated.",
    },
    el: {
      title: "Σχετικά με το Mouxti: Σύγκριση Τιμών Κύπρου",
      description: "Σχετικά με το Mouxti: δωρεάν, ανεξάρτητος ιστότοπος που συγκρίνει τιμές βενζίνης, καφέ και σουβλακιού στην Κύπρο, με ημερομηνία σε κάθε τιμή.",
    },
    ru: {
      title: "О сайте Mouxti: сравнение цен на Кипре",
      description: "О Mouxti: бесплатный независимый сайт сравнения цен на бензин, кофе и сувлаки на Кипре. У каждой цены указана дата.",
    },
  },
  contact: {
    en: {
      title: "Contact Mouxti: Report a Price or Suggest a Fix",
      description: "Contact Mouxti to report a wrong price, suggest a new tracker or ask a question about the Cyprus price data.",
    },
    el: {
      title: "Επικοινωνία με το Mouxti: Αναφορά Τιμής",
      description: "Επικοινωνήστε με το Mouxti για να αναφέρετε λάθος τιμή, να προτείνετε νέο εργαλείο ή να κάνετε ερώτηση για τα δεδομένα τιμών της Κύπρου.",
    },
    ru: {
      title: "Контакты Mouxti: сообщить о неверной цене",
      description: "Свяжитесь с Mouxti, чтобы сообщить о неверной цене, предложить новый трекер или задать вопрос о ценовых данных по Кипру.",
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy | Mouxti",
      description: "How Mouxti handles data, cookies and advertising. We collect no personal data; this policy also covers third-party ad cookies.",
    },
    el: {
      title: "Πολιτική Απορρήτου | Mouxti",
      description: "Πώς το Mouxti χειρίζεται δεδομένα, cookies και διαφημίσεις. Δεν συλλέγουμε προσωπικά δεδομένα· καλύπτονται και τα cookies τρίτων διαφημίσεων.",
    },
    ru: {
      title: "Политика конфиденциальности | Mouxti",
      description: "Как Mouxti работает с данными, cookie и рекламой. Мы не собираем личные данные; политика охватывает и сторонние рекламные cookie.",
    },
  },
  terms: {
    en: {
      title: "Terms of Service | Mouxti",
      description: "Terms governing the use of Mouxti, a free informational website comparing fuel, coffee and souvlaki prices in Cyprus.",
    },
    el: {
      title: "Όροι Χρήσης | Mouxti",
      description: "Όροι χρήσης του Mouxti, δωρεάν ενημερωτικού ιστότοπου σύγκρισης τιμών καυσίμων, καφέ και σουβλακιού στην Κύπρο.",
    },
    ru: {
      title: "Условия использования | Mouxti",
      description: "Условия использования Mouxti, бесплатного информационного сайта для сравнения цен на топливо, кофе и сувлаки на Кипре.",
    },
  },
};
