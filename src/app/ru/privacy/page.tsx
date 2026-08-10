import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description:
    "Как DealsHub обращается с данными, cookie и рекламой. Мы не собираем персональные данные; политика также охватывает сторонние рекламные cookie.",
  alternates: {
    canonical: "/ru/privacy/",
    languages: { en: "/privacy/", el: "/el/privacy/", ru: "/ru/privacy/", "x-default": "/privacy/" },
  },
};

export default function PrivacyRu() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Политика конфиденциальности</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Последнее обновление: 10 августа 2026 г.</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          DealsHub (&laquo;мы&raquo;) — это информационный сайт, который сравнивает общедоступные цены,
          акции и вакансии государственного сектора на Кипре. Настоящая политика объясняет, какие
          данные задействованы при посещении сайта.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Какие данные мы собираем</h2>
          <p>
            Мы не запрашиваем и не храним персональные данные. Нет учётных записей, регистраций или форм
            обратной связи. Наш хостинг-провайдер (Cloudflare) обрабатывает стандартные технические
            данные запросов — такие как IP-адрес и тип браузера — для доставки и защиты сайта.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Cookie и локальное хранилище</h2>
          <p>
            Мы используем локальное хранилище браузера только для запоминания ваших настроек отображения
            (светлая или тёмная тема и язык). Собственных отслеживающих cookie мы не устанавливаем.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Реклама</h2>
          <p>
            В будущем мы можем показывать рекламу через Google AdSense. В этом случае сторонние
            поставщики, включая Google, могут использовать cookie для показа рекламы на основе ваших
            прежних посещений этого и других сайтов.
          </p>
          <p className="mt-3">
            Вы можете отказаться от персонализированной рекламы в{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">настройках рекламы Google</a>, или от cookie
            сторонних поставщиков на{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Ссылки на другие сайты</h2>
          <p>
            Объявления об акциях и вакансиях ведут на внешние сайты (магазины, приложения доставки,
            государственные страницы) с собственными политиками конфиденциальности, которые мы не
            контролируем.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Дети</h2>
          <p>Сайт не предназначен для детей младше 16 лет, и мы сознательно не собираем их данные.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Контакт</h2>
          <p>
            Вопросы по политике: <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Изменения</h2>
          <p>Мы можем обновлять эту политику; дата выше показывает последнюю редакцию.</p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/ru" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Назад в DealsHub</Link>
      </div>
    </article>
  );
}
