// Shared site strings and helpers for the EN / EL / RU shell (nav, footer, home hub,
// tool-page template). Tool-specific table text lives in the table components.

export type Lang = "en" | "el" | "ru";
export const LANGS: Lang[] = ["en", "el", "ru"];

// Every tracker the code knows about, and the ones that are live. "supermarket" and
// "jobs" are hidden for now (their routes are the private _jobs and
// _supermarket-price-watch folders). To show one again: rename its route folders back,
// remove `hidden: true` from the supermarket markdown, add the tool to TOOLS below,
// restore the sitemap entry and remove it from functions/_middleware.js.
export const ALL_TOOLS = ["fuel", "supermarket", "coffee", "souvlaki", "jobs"] as const;
export type Tool = (typeof ALL_TOOLS)[number];
export const TOOLS: readonly Tool[] = ["fuel", "supermarket", "coffee", "souvlaki"];

// URL path (no leading/trailing slash) of each tool, identical in every language.
export const TOOL_PATH: Record<Tool, string> = {
  fuel: "posts/cheapest-petrol-stations-cyprus",
  supermarket: "posts/cheapest-supermarket-products",
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
  for (const t of ALL_TOOLS) if (p === `/${TOOL_PATH[t]}`) return t;
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
  cardLabel: Record<Tool, string>;
  todayTitle: string;
  seeAll: string;
  topThreeTitle: string;
  trust: [string, string, string];
  trustLink: string;
  down: string;
  up: string;
  changeVs: (dir: string, amount: string, since: string) => string;
  changeSame: (since: string) => string;
  changeFrom: (amount: string, prev: string) => string;
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
  wasWord: string; // "was" before the previous price in the supermarket home card
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
      supermarket: "The products with the biggest price cuts at Cyprus supermarkets.",
      coffee: "The cheapest freddo espresso in each city.",
      souvlaki: "Souvlaki pita prices by city, cheapest first.",
      jobs: "Every open public-sector vacancy in Cyprus in one list.",
    },
    figureLabel: {
      fuel: "Cheapest Unleaded 95",
      supermarket: "Biggest drop in lowest price",
      coffee: "Cheapest freddo espresso",
      souvlaki: "Cheapest pork souvlaki pita",
      jobs: "Open vacancies",
    },
    home: "Home",
    breadcrumb: "Breadcrumb",
    otherTrackers: "Other trackers",
    updated: "Last updated",
    source: "Source",
    aboutData: "About this data",
    homeTitle: "Cyprus price trackers",
    homeIntro: "Fuel, supermarket, coffee and souvlaki prices across Cyprus, refreshed regularly. Pick a tracker.",
    cardLabel: { fuel: "Unleaded 95", supermarket: "Biggest price drop", coffee: "Freddo espresso", souvlaki: "Souvlaki pita", jobs: "Public jobs" },
    todayTitle: "Today's cheapest in Cyprus",
    seeAll: "See all prices",
    topThreeTitle: "Cheapest right now",
    trust: ["Official and delivery-platform data", "Refreshed regularly, every price is dated", "Independent, no paid placement"],
    trustLink: "How it works",
    down: "down",
    up: "up",
    changeVs: (dir: string, amount: string, since: string) => `${dir} ${amount} vs ${since}`,
    changeSame: (since: string) => `unchanged vs ${since}`,
    changeFrom: (amount: string, prev: string) => `down ${amount}, from ${prev}`,
    homeDescription:
      "Cyprus price trackers: cheapest petrol and diesel, supermarket price cuts, freddo espresso and souvlaki prices by city. Updated automatically.",
    footerNav: "Footer",
    about: "About",
    contact: "Contact",
    privacy: "Privacy Policy",
    terms: "Terms",
    cookieText: "Essential cookies, maybe ad cookies. See",
    cookiePrivacy: "Privacy Policy",
    cookieEnd: ".",
    accept: "Accept",
    decline: "Decline",
    cookieLabel: "Cookie notice",
    theme: "Dark mode",
    language: "Language",
    notFoundTitle: "Page not found",
    notFoundText: "That page does not exist. Try one of the trackers:",
    perLitre: "/L",
    wasWord: "down from",
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
      supermarket: "Τα προϊόντα με τις μεγαλύτερες μειώσεις τιμής στα σούπερ μάρκετ της Κύπρου.",
      coffee: "Ο φθηνότερος φρέντο εσπρέσο σε κάθε πόλη.",
      souvlaki: "Τιμές σουβλακιού σε πίτα ανά πόλη, με το φθηνότερο πρώτο.",
      jobs: "Όλες οι ανοιχτές θέσεις του δημόσιου τομέα στην Κύπρο σε μία λίστα.",
    },
    figureLabel: {
      fuel: "Φθηνότερη Αμόλυβδη 95",
      supermarket: "Μεγαλύτερη πτώση χαμηλότερης τιμής",
      coffee: "Φθηνότερος φρέντο εσπρέσο",
      souvlaki: "Φθηνότερο σουβλάκι χοιρινό σε πίτα",
      jobs: "Ανοιχτές θέσεις",
    },
    home: "Αρχική",
    breadcrumb: "Διαδρομή πλοήγησης",
    otherTrackers: "Άλλα εργαλεία",
    updated: "Τελευταία ενημέρωση",
    source: "Πηγή",
    aboutData: "Σχετικά με τα δεδομένα",
    homeTitle: "Τιμές στην Κύπρο",
    homeIntro: "Τιμές καυσίμων, σούπερ μάρκετ, καφέ και σουβλακιού στην Κύπρο, με τακτική ενημέρωση. Διαλέξτε εργαλείο.",
    cardLabel: { fuel: "Αμόλυβδη 95", supermarket: "Μεγαλύτερη πτώση", coffee: "Φρέντο εσπρέσο", souvlaki: "Πίτα σουβλάκι", jobs: "Δημόσιες θέσεις" },
    todayTitle: "Τα φθηνότερα σήμερα στην Κύπρο",
    seeAll: "Όλες οι τιμές",
    topThreeTitle: "Φθηνότερα τώρα",
    trust: ["Επίσημα δεδομένα και πλατφόρμες delivery", "Τακτική ενημέρωση, κάθε τιμή έχει ημερομηνία", "Ανεξάρτητο, χωρίς πληρωμένες προβολές"],
    trustLink: "Πώς λειτουργεί",
    down: "πτώση",
    up: "αύξηση",
    changeVs: (dir: string, amount: string, since: string) => `${dir} ${amount} έναντι ${since}`,
    changeSame: (since: string) => `αμετάβλητη έναντι ${since}`,
    changeFrom: (amount: string, prev: string) => `πτώση ${amount}, από ${prev}`,
    homeDescription:
      "Τιμές στην Κύπρο: φθηνότερη βενζίνη και πετρέλαιο, εκπτώσεις σούπερ μάρκετ, φρέντο εσπρέσο και σουβλάκι ανά πόλη. Αυτόματη ενημέρωση.",
    footerNav: "Υποσέλιδο",
    about: "Σχετικά",
    contact: "Επικοινωνία",
    privacy: "Πολιτική Απορρήτου",
    terms: "Όροι",
    cookieText: "Απαραίτητα cookies, ίσως και διαφημιστικά. Δείτε",
    cookiePrivacy: "Πολιτική Απορρήτου",
    cookieEnd: ".",
    accept: "Αποδοχή",
    decline: "Απόρριψη",
    cookieLabel: "Ειδοποίηση cookies",
    theme: "Σκοτεινή λειτουργία",
    language: "Γλώσσα",
    notFoundTitle: "Η σελίδα δεν βρέθηκε",
    notFoundText: "Αυτή η σελίδα δεν υπάρχει. Δοκιμάστε ένα από τα εργαλεία:",
    perLitre: "/L",
    wasWord: "από",
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
      supermarket: "Товары с самым большим снижением цены в супермаркетах Кипра.",
      coffee: "Самый дешёвый фредо эспрессо в каждом городе.",
      souvlaki: "Цены на сувлаки в пите по городам, сначала самые дешёвые.",
      jobs: "Все открытые вакансии государственного сектора Кипра в одном списке.",
    },
    figureLabel: {
      fuel: "Самый дешёвый Unleaded 95",
      supermarket: "Крупнейшее падение минимальной цены",
      coffee: "Самый дешёвый фредо эспрессо",
      souvlaki: "Самый дешёвый сувлаки из свинины в пите",
      jobs: "Открытые вакансии",
    },
    home: "Главная",
    breadcrumb: "Хлебные крошки",
    otherTrackers: "Другие трекеры",
    updated: "Последнее обновление",
    source: "Источник",
    aboutData: "О данных",
    homeTitle: "Цены на Кипре",
    homeIntro: "Цены на топливо, супермаркеты, кофе и сувлаки на Кипре, обновляются регулярно. Выберите трекер.",
    cardLabel: { fuel: "Бензин 95", supermarket: "Самое большое снижение", coffee: "Фрэддо эспрессо", souvlaki: "Сувлаки в пите", jobs: "Госвакансии" },
    todayTitle: "Самое дешёвое сегодня на Кипре",
    seeAll: "Все цены",
    topThreeTitle: "Дешевле всего сейчас",
    trust: ["Официальные данные и платформы доставки", "Регулярное обновление, у каждой цены есть дата", "Независимо, без платного размещения"],
    trustLink: "Как это работает",
    down: "снижение",
    up: "рост",
    changeVs: (dir: string, amount: string, since: string) => `${dir} ${amount} к ${since}`,
    changeSame: (since: string) => `без изменений к ${since}`,
    changeFrom: (amount: string, prev: string) => `снижение ${amount}, было ${prev}`,
    homeDescription:
      "Цены на Кипре: дешёвый бензин и дизель, скидки в супермаркетах, фредо эспрессо и сувлаки по городам. Автоматическое обновление.",
    footerNav: "Нижнее меню",
    about: "О сайте",
    contact: "Контакты",
    privacy: "Политика конфиденциальности",
    terms: "Условия",
    cookieText: "Необходимые cookie, возможно рекламные. См.",
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
    wasWord: "было",
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
