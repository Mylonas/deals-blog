import CarsTable, { type CarsData } from "@/components/CarsTable";
import data from "@/data/bazaraki-cars.json";
import Link from "next/link";

export const metadata = {
  title: "Самые дешёвые авто на Кипре — актуальные объявления Bazaraki",
  description:
    "Все автомобили с Bazaraki Кипр, сначала самые дешёвые. Фильтры по марке, году, топливу, коробке, типу кузова, городу, цене и пробегу. Обновляется ежедневно.",
};

export default function CheapestCarsRU() {
  return (
    <article className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Транспорт
        </span>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">ОНЛАЙН ●</span>
      </div>

      <h1 className="text-3xl font-bold mb-3 leading-tight">Самые дешёвые авто на Кипре</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Все автомобили, выставленные на Bazaraki, начиная с самых дешёвых. Фильтры
        по марке, году, топливу, коробке передач, кузову, городу, цене и пробегу.
        Цены и фото берутся напрямую с bazaraki.com и обновляются раз в день.
      </p>

      <CarsTable data={data as unknown as CarsData} lang="ru" />

      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/ru/" className="text-sm text-blue-500 hover:underline">← Ко всем предложениям</Link>
      </div>
    </article>
  );
}
