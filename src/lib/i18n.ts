// Shared site strings and helpers for the EN / EL / RU shell (nav, footer, home hub,
// tool-page template). Tool-specific table text lives in the table components.

export type Lang = "en" | "el" | "ru";
export const LANGS: Lang[] = ["en", "el", "ru"];

export const TOOLS = ["fuel", "supermarket", "coffee", "souvlaki", "jobs"] as const;
export type Tool = (typeof TOOLS)[number];

// URL path (no leading/trailing slash) of each tool, identical in every language.
export const TOOL_PATH: Record<Tool, string> = {
  fuel: "posts/cheapest-petrol-stations-cyprus",
  supermarket: "posts/supermarket-price-watch",
  coffee: "posts/cheapest-coffee-nicosia",
  souvlaki: "posts/cheapest-souvlaki-cyprus",
  jobs: "jobs",
};

const prefix = (lang: Lang) => (lang === "en" ? "" : `/${lang}`);
export const homeHref = (lang: Lang) => (lang === "en" ? "/" : `/${lang}/`);
export const toolHref = (lang: Lang, tool: Tool) => `${prefix(lang)}/${TOOL_PATH[tool]}/`;
export const pageHref = (lang: Lang, page: "about" | "contact" | "privacy" | "terms") =>
  `${prefix(lang)}/${page}/`;

export function langFromPath(pathname: string): Lang {
  if (pathname === "/el" || pathname.startsWith("/el/")) return "el";
  if (pathname === "/ru" || pathname.startsWith("/ru/")) return "ru";
  return "en";
}

export function toolFromPath(pathname: string): Tool | null {
  const p = pathname.replace(/^\/(el|ru)(?=\/|$)/, "").replace(/\/+$/, "");
  for (const t of TOOLS) if (p === `/${TOOL_PATH[t]}`) return t;
  return null;
}

type Strings = {
  tagline: string;
  skip: string;
  menu: string;
  menuClose: string;
  mainNav: string;
  tools: Record<Tool, string>;
  toolSummary: Record<Tool, string>;
  figureLabel: Record<Tool, string>;
  home: string;
  breadcrumb: string;
  otherTrackers: string;
  updated: string;
  source: string;
  aboutData: string;
  homeTitle: string;
  homeIntro: string;
  homeDescription: string;
  footerNav: string;
  about: string;
  contact: string;
  privacy: string;
  terms: string;
  cookieText: string;
  cookiePrivacy: string;
  cookieEnd: string;
  accept: string;
  decline: string;
  cookieLabel: string;
  theme: string;
  language: string;
  notFoundTitle: string;
  notFoundText: string;
  perLitre: string;
  vacancies: (n: number) => string;
};

export const STR: Record<Lang, Strings> = {
  en: {
    tagline: "Cyprus price trackers",
    skip: "Skip to main content",
    menu: "Menu",
    menuClose: "Close menu",
    mainNav: "Main",
    tools: { fuel: "Fuel", supermarket: "Supermarket", coffee: "Coffee", souvlaki: "Souvlaki", jobs: "Jobs" },
    toolSummary: {
      fuel: "Petrol and diesel prices at every station in Cyprus, cheapest first.",
      supermarket: "What ten everyday groceries cost at the cheapest Cyprus supermarket.",
      coffee: "The cheapest freddo espresso in each city.",
      souvlaki: "Souvlaki pita prices by city, cheapest first.",
      jobs: "Every open public-sector vacancy in Cyprus in one list.",
    },
    figureLabel: {
      fuel: "Cheapest Unleaded 95",
      supermarket: "Basket of 10 staples from",
      coffee: "Cheapest freddo espresso",
      souvlaki: "Cheapest pork souvlaki pita",
      jobs: "Open vacancies",
    },
    home: "Home",
    breadcrumb: "Breadcrumb",
    otherTrackers: "Other trackers",
    updated: "Updated",
    source: "Source",
    aboutData: "About this data",
    homeTitle: "Cyprus price trackers",
    homeIntro: "Live prices and vacancies across Cyprus, refreshed automatically. Pick a tracker.",
    homeDescription:
      "Live Cyprus price trackers: cheapest petrol, supermarket prices, freddo espresso, souvlaki and public-sector jobs. Updated automatically.",
    footerNav: "Footer",
    about: "About",
    contact: "Contact",
    privacy: "Privacy Policy",
    terms: "Terms",
    cookieText: "We use cookies for essential site functions and may use third-party advertising cookies via Google AdSense. See our",
    cookiePrivacy: "Privacy Policy",
    cookieEnd: "for details.",
    accept: "Accept",
    decline: "Decline",
    cookieLabel: "Cookie notice",
    theme: "Dark mode",
    language: "Language",
    notFoundTitle: "Page not found",
    notFoundText: "That page does not exist. Try one of the trackers:",
    perLitre: "/L",
    vacancies: (n) => `${n} open ${n === 1 ? "vacancy" : "vacancies"}`,
  },
  el: {
    tagline: "Τιμές στην Κύπρο",
    skip: "Μετάβαση στο κύριο περιεχόμενο",
    menu: "Μενού",
    menuClose: "Κλείσιμο μενού",
    mainNav: "Κύρια",
    tools: { fuel: "Καύσιμα", supermarket: "Σούπερ μάρκετ", coffee: "Καφές", souvlaki: "Σουβλάκι", jobs: "Θέσεις εργασίας" },
    toolSummary: {
      fuel: "Τιμές βενζίνης και πετρελαίου σε κάθε πρατήριο της Κύπρου, με το φθηνότερο πρώτο.",
      supermarket: "Πόσο κοστίζουν δέκα καθημερινά προϊόντα στο φθηνότερο σούπερ μάρκετ.",
      coffee: "Ο φθηνότερος φρέντο εσπρέσο σε κάθε πόλη.",
      souvlaki: "Τιμές σουβλακιού σε πίτα ανά πόλη, με το φθηνότερο πρώτο.",
      jobs: "Όλες οι ανοιχτές θέσεις του δημόσιου τομέα στην Κύπρο σε μία λίστα.",
    },
    figureLabel: {
      fuel: "Φθηνότερη Αμόλυβδη 95",
      supermarket: "Καλάθι 10 προϊόντων από",
      coffee: "Φθηνότερος φρέντο εσπρέσο",
      souvlaki: "Φθηνότερο σουβλάκι χοιρινό σε πίτα",
      jobs: "Ανοιχτές θέσεις",
    },
    home: "Αρχική",
    breadcrumb: "Διαδρομή πλοήγησης",
    otherTrackers: "Άλλα εργαλεία",
    updated: "Ενημερώθηκε",
    source: "Πηγή",
    aboutData: "Σχετικά με τα δεδομένα",
    homeTitle: "Τιμές στην Κύπρο",
    homeIntro: "Ζωντανές τιμές και θέσεις εργασίας στην Κύπρο, με αυτόματη ενημέρωση. Διαλέξτε εργαλείο.",
    homeDescription:
      "Ζωντανές τιμές στην Κύπρο: φθηνότερη βενζίνη, σούπερ μάρκετ, φρέντο εσπρέσο, σουβλάκι και θέσεις εργασίας στον δημόσιο τομέα. Αυτόματη ενημέρωση.",
    footerNav: "Υποσέλιδο",
    about: "Σχετικά",
    contact: "Επικοινωνία",
    privacy: "Πολιτική Απορρήτου",
    terms: "Όροι",
    cookieText: "Χρησιμοποιούμε cookies για βασικές λειτουργίες και ενδέχεται να χρησιμοποιήσουμε cookies διαφήμισης τρίτων μέσω Google AdSense. Δείτε την",
    cookiePrivacy: "Πολιτική Απορρήτου",
    cookieEnd: "για λεπτομέρειες.",
    accept: "Αποδοχή",
    decline: "Απόρριψη",
    cookieLabel: "Ειδοποίηση cookies",
    theme: "Σκοτεινή λειτουργία",
    language: "Γλώσσα",
    notFoundTitle: "Η σελίδα δεν βρέθηκε",
    notFoundText: "Αυτή η σελίδα δεν υπάρχει. Δοκιμάστε ένα από τα εργαλεία:",
    perLitre: "/L",
    vacancies: (n) => `${n} ${n === 1 ? "ανοιχτή θέση" : "ανοιχτές θέσεις"}`,
  },
  ru: {
    tagline: "Цены на Кипре",
    skip: "Перейти к основному содержимому",
    menu: "Меню",
    menuClose: "Закрыть меню",
    mainNav: "Основное",
    tools: { fuel: "Топливо", supermarket: "Супермаркет", coffee: "Кофе", souvlaki: "Сувлаки", jobs: "Вакансии" },
    toolSummary: {
      fuel: "Цены на бензин и дизель на каждой заправке Кипра, сначала самые дешёвые.",
      supermarket: "Сколько стоят десять повседневных продуктов в самом дешёвом супермаркете.",
      coffee: "Самый дешёвый фредо эспрессо в каждом городе.",
      souvlaki: "Цены на сувлаки в пите по городам, сначала самые дешёвые.",
      jobs: "Все открытые вакансии государственного сектора Кипра в одном списке.",
    },
    figureLabel: {
      fuel: "Самый дешёвый Unleaded 95",
      supermarket: "Корзина из 10 продуктов от",
      coffee: "Самый дешёвый фредо эспрессо",
      souvlaki: "Самый дешёвый сувлаки из свинины в пите",
      jobs: "Открытые вакансии",
    },
    home: "Главная",
    breadcrumb: "Хлебные крошки",
    otherTrackers: "Другие трекеры",
    updated: "Обновлено",
    source: "Источник",
    aboutData: "О данных",
    homeTitle: "Цены на Кипре",
    homeIntro: "Актуальные цены и вакансии на Кипре, обновляются автоматически. Выберите трекер.",
    homeDescription:
      "Актуальные цены на Кипре: дешёвый бензин, супермаркеты, фредо эспрессо, сувлаки и вакансии госсектора. Автоматическое обновление.",
    footerNav: "Нижнее меню",
    about: "О сайте",
    contact: "Контакты",
    privacy: "Политика конфиденциальности",
    terms: "Условия",
    cookieText: "Мы используем cookie для основных функций сайта и можем использовать рекламные cookie третьих сторон через Google AdSense. Подробнее в",
    cookiePrivacy: "Политике конфиденциальности",
    cookieEnd: ".",
    accept: "Принять",
    decline: "Отклонить",
    cookieLabel: "Уведомление о cookie",
    theme: "Тёмная тема",
    language: "Язык",
    notFoundTitle: "Страница не найдена",
    notFoundText: "Такой страницы нет. Попробуйте один из трекеров:",
    perLitre: "/л",
    vacancies: (n) => {
      const m10 = n % 10;
      const m100 = n % 100;
      const w =
        m10 === 1 && m100 !== 11
          ? "открытая вакансия"
          : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
            ? "открытые вакансии"
            : "открытых вакансий";
      return `${n} ${w}`;
    },
  },
};

const LOCALE: Record<Lang, string> = { en: "en-GB", el: "el-GR", ru: "ru-RU" };

export function formatDate(iso: string | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Nicosia",
  }).format(d);
}

export function formatEuro(n: number, lang: Lang, digits = 2): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
