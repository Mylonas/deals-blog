import type { Metadata } from "next";
import HomeHub from "@/components/HomeHub";
import { STR } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { absolute: "Mouxti — Cyprus price trackers: fuel, coffee, souvlaki" },
  description: STR.en.homeDescription,
  alternates: {
    canonical: "/",
    languages: { en: "/", el: "/el/", ru: "/ru/", "x-default": "/" },
  },
};

export default function Home() {
  return <HomeHub lang="en" />;
}
