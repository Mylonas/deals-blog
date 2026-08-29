import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Условия использования",
  description:
    "Условия использования DealsHub — бесплатного информационного сайта для сравнения цен, предложений и вакансий государственного сектора на Кипре.",
  alternates: {
    canonical: "/ru/terms/",
    languages: { en: "/terms/", el: "/el/terms/", ru: "/ru/terms/", "x-default": "/terms/" },
  },
};

export default function TermsRu() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Условия использования</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Последнее обновление: 29 августа 2026 г.</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Добро пожаловать на DealsHub. Используя сайт, вы соглашаетесь со следующими условиями.
          Если вы не согласны, пожалуйста, не пользуйтесь сайтом.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Что мы предоставляем</h2>
          <p>
            DealsHub — бесплатный информационный сайт, который собирает и сравнивает общедоступные
            цены, предложения и вакансии государственного сектора на Кипре. Весь контент
            предоставляется «как есть» исключительно в информационных целях.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Точность</h2>
          <p>
            Мы прилагаем разумные усилия для поддержания актуальности цен и объявлений, но не
            гарантируем их точность, полноту или своевременность. Цены берутся со сторонних сайтов
            и могут изменяться без уведомления. Всегда проверяйте информацию у продавца или
            официального источника.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Внешние ссылки</h2>
          <p>
            Сайт содержит ссылки на внешние ресурсы (магазины, службы доставки, государственные
            порталы). Мы не несём ответственности за содержание, доступность или политику этих сайтов.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Интеллектуальная собственность</h2>
          <p>
            Оригинальный контент, дизайн и код DealsHub являются собственностью владельца сайта.
            Названия продуктов, логотипы и товарные знаки принадлежат их соответствующим владельцам.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Ограничение ответственности</h2>
          <p>
            DealsHub и его оператор не несут ответственности за любой прямой, косвенный или
            сопутствующий ущерб, возникший в результате использования сайта или доверия к его
            содержимому. Вы используете информацию на свой страх и риск.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Реклама</h2>
          <p>
            На сайте могут отображаться рекламные объявления третьих сторон через Google AdSense.
            Эти объявления могут использовать cookie; подробности в нашей{" "}
            <Link href="/ru/privacy/" className="text-blue-600 dark:text-blue-400 hover:underline">Политике конфиденциальности</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Изменения</h2>
          <p>
            Мы можем обновить эти условия в любое время. Продолжение использования сайта после
            изменений означает их принятие.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Контакты</h2>
          <p>
            Вопросы об условиях:{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/ru/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Назад на DealsHub</Link>
      </div>
    </article>
  );
}
