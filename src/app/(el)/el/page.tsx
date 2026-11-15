import type { Metadata } from "next";
import HomeHub from "@/components/HomeHub";
import { STR } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { absolute: "Mouxti — Τιμές στην Κύπρο: καύσιμα, καφές, σουβλάκι" },
  description: STR.el.homeDescription,
  alternates: {
    canonical: "/el/",
    languages: { en: "/", el: "/el/", ru: "/ru/", "x-default": "/" },
  },
};

export default function Home() {
  return <HomeHub lang="el" />;
}
