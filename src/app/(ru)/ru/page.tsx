import type { Metadata } from "next";
import HomeHub from "@/components/HomeHub";
import { STR } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { absolute: "Mouxti — Цены на Кипре: топливо, супермаркет, кофе, сувлаки, вакансии" },
  description: STR.ru.homeDescription,
  alternates: {
    canonical: "/ru/",
    languages: { en: "/", el: "/el/", ru: "/ru/", "x-default": "/" },
  },
};

export default function Home() {
  return <HomeHub lang="ru" />;
}
