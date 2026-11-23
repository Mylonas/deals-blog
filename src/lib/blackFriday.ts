import data from "@/data/black-friday.json";
import type { Lang } from "@/lib/i18n";

export type BfOffer = {
  id: string;
  store: string;
  channel: "online" | "store" | "both";
  starts?: string;
  ends: string | null;
  checked: string;
  url: string;
  deal: Record<Lang, string>;
  kind: "product" | "single" | "storewide";
  note?: Record<Lang, string>;
  product?: string;
  price?: number;
  was?: number;
  compare?: { date: string; stores: { store: string; price: number; url?: string }[] };
};

export const BF_OFFERS = (data as { offers: BfOffer[] }).offers;
const CYBER_MONDAY = (data as { cyberMonday: string }).cyberMonday;

// Today's date in Cyprus as YYYY-MM-DD.
export function cyprusToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Nicosia" }).format(now);
}

// An offer with no stated end date lapses after Cyber Monday.
const endOf = (o: BfOffer) => o.ends ?? CYBER_MONDAY;

export function liveOffers(today: string): BfOffer[] {
  return BF_OFFERS.filter((o) => endOf(o) >= today);
}

// The whole section hides after the latest end date (never earlier than Cyber Monday).
export function sectionLastDay(): string {
  return BF_OFFERS.reduce((m, o) => (endOf(o) > m ? endOf(o) : m), CYBER_MONDAY);
}

export const isSectionLive = (today: string) => today <= sectionLastDay();

export const BF_PATH = "black-friday-cyprus";
export const bfHref = (lang: Lang) => (lang === "en" ? `/${BF_PATH}/` : `/${lang}/${BF_PATH}/`);

export const BF_STR: Record<
  Lang,
  {
    title: string;
    h1: string;
    lead: string;
    homeLabel: string;
    homeCta: string;
    channel: Record<BfOffer["channel"], string>;
    until: string;
    noEnd: string;
    from: string;
    checked: string;
    source: string;
    note: string;
    expired: string;
    count: (n: number) => string;
    productsTitle: string;
    storewideTitle: string;
    singleTitle: string;
    was: string;
    lowest: string;
    compared: string;
  }
> = {
  en: {
    title: "Black Friday 2026 in Cyprus: checked offers",
    h1: "Black Friday 2026 in Cyprus",
    lead: "Offers we saw on the store's own page, each with the date we checked it. Black Friday is Fri 27 Nov, Cyber Monday Mon 30 Nov.",
    homeLabel: "Black Friday 2026",
    homeCta: "See checked offers",
    channel: { online: "Online", store: "In store", both: "Online and in store" },
    until: "Until",
    noEnd: "End date not stated",
    from: "From",
    checked: "Checked",
    source: "Source",
    note: "Independent, no paid placement, no affiliate links. Offers can change or sell out; confirm on the source page.",
    expired: "These offers have ended.",
    count: (n) => `${n} checked offers`,
    productsTitle: "Products 50% off or more, at their lowest price",
    storewideTitle: "Store-wide offers",
    singleTitle: "Single store, not price-compared",
    was: "was",
    lowest: "Lowest of the stores we compared; also at",
    compared: "compared",
  },
  el: {
    title: "Black Friday 2026 στην Κύπρο: ελεγμένες προσφορές",
    h1: "Black Friday 2026 στην Κύπρο",
    lead: "Προσφορές που είδαμε στη σελίδα του ίδιου του καταστήματος, με την ημερομηνία ελέγχου. Black Friday Παρ 27 Νοε, Cyber Monday Δευ 30 Νοε.",
    homeLabel: "Black Friday 2026",
    homeCta: "Δείτε τις ελεγμένες προσφορές",
    channel: { online: "Online", store: "Στο κατάστημα", both: "Online και στο κατάστημα" },
    until: "Έως",
    noEnd: "Δεν αναφέρεται λήξη",
    from: "Από",
    checked: "Έλεγχος",
    source: "Πηγή",
    note: "Ανεξάρτητο, χωρίς πληρωμένες προβολές, χωρίς affiliate συνδέσμους. Οι προσφορές μπορεί να αλλάξουν ή να εξαντληθούν· επιβεβαιώστε στη σελίδα της πηγής.",
    expired: "Αυτές οι προσφορές έχουν λήξει.",
    count: (n) => `${n} ελεγμένες προσφορές`,
    productsTitle: "Προϊόντα με έκπτωση 50% ή περισσότερο, στη χαμηλότερη τιμή",
    storewideTitle: "Προσφορές καταστημάτων",
    singleTitle: "Ένα κατάστημα, χωρίς σύγκριση τιμών",
    was: "από",
    lowest: "Η χαμηλότερη από τα καταστήματα που συγκρίναμε· επίσης στο",
    compared: "σύγκριση",
  },
  ru: {
    title: "Black Friday 2026 на Кипре: проверенные предложения",
    h1: "Black Friday 2026 на Кипре",
    lead: "Предложения, которые мы увидели на странице самого магазина, с датой проверки. Black Friday: пт 27 ноября, Cyber Monday: пн 30 ноября.",
    homeLabel: "Black Friday 2026",
    homeCta: "Смотреть проверенные предложения",
    channel: { online: "Онлайн", store: "В магазине", both: "Онлайн и в магазине" },
    until: "До",
    noEnd: "Срок не указан",
    from: "С",
    checked: "Проверено",
    source: "Источник",
    note: "Независимо, без платного размещения и партнёрских ссылок. Предложения могут измениться или закончиться: проверяйте на странице источника.",
    expired: "Эти предложения закончились.",
    count: (n) => `${n} проверенных предложений`,
    productsTitle: "Товары со скидкой 50% и более, по самой низкой цене",
    storewideTitle: "Предложения магазинов",
    singleTitle: "Один магазин, цены не сравнивались",
    was: "было",
    lowest: "Самая низкая среди сравнённых магазинов; также в",
    compared: "сравнение",
  },
};
