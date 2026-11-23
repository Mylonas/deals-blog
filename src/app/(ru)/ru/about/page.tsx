import { pageMeta } from "@/lib/seo";
import { PAGES } from "@/lib/seoMeta";
import Link from "next/link";

export const metadata = pageMeta({ lang: "ru", path: "about", ...PAGES.about.ru });

export default function AboutRu() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">О Mouxti</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          Mouxti — бесплатный, независимый сайт, созданный для того, чтобы помочь жителям Кипра
          находить лучшие цены и экономить на повседневных расходах. Мы сравниваем общедоступные
          цены с заправок, из кофеен и платформ доставки еды — всё в одном месте.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Что мы охватываем</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Цены на топливо на заправках по всему Кипру</li>
            <li>Цены на кофе в кафе по всему Кипру</li>
            <li>Цены на сувлаки в ресторанах и на платформах доставки</li>
            <li>Тренды цен и исторические сравнения</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Как это работает</h2>
          <p>
            Мы автоматически собираем данные о ценах из общедоступных источников регулярно: от нескольких часов до пары дней в зависимости от источника (цены на топливо обновляются вручную), и у каждой цены своя дата.
            Данные сравниваются, ранжируются и представляются в удобных таблицах и графиках,
            чтобы вы могли быстро найти самый выгодный вариант рядом с вами.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Наши принципы</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>Бесплатно навсегда</strong> — без подписок, без ограничений</li>
            <li><strong>Независимо</strong> — мы не связаны ни с одним продавцом или брендом</li>
            <li><strong>Прозрачно</strong> — цены берутся из публичных источников, у каждой цены своя дата</li>
            <li><strong>Многоязычно</strong> — доступно на английском, греческом и русском языках</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Кто ведёт проект</h2>
          <p>
            Mouxti — персональный проект Михалиса Милонаса, разработчика программного обеспечения
            из Никосии, Кипр. Начинался как простой инструмент сравнения цен и вырос в
            полноценный ресурс для повседневной экономии.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Свяжитесь с нами</h2>
          <p>
            Есть предложение, нашли ошибку или хотите поздороваться? Email{" "}
            <a className="text-blue-700 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/ru/" className="text-sm text-blue-700 dark:text-blue-400 hover:underline">&larr; Назад на Mouxti</Link>
      </div>
    </article>
  );
}
