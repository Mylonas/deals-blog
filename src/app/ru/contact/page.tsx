import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Свяжитесь с командой DealsHub. Сообщите об ошибках, предложите улучшения или задайте вопросы.",
  alternates: {
    canonical: "/ru/contact/",
    languages: { en: "/contact/", el: "/el/contact/", ru: "/ru/contact/", "x-default": "/contact/" },
  },
};

export default function ContactRu() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Контакты</h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed mt-8">
        <p>
          Мы будем рады вашему обращению. Если у вас есть предложение, вы заметили ошибку в наших
          данных, или просто хотите поздороваться — не стесняйтесь написать.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">Email</h2>
          <p>
            Лучший способ связаться с нами — по электронной почте:{" "}
            <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mikmylona@gmail.com">mikmylona@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">По каким вопросам можно обращаться</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Неточные или устаревшие данные о ценах</li>
            <li>Предложения по новым товарам, магазинам или функциям</li>
            <li>Отчёты об ошибках или проблемы с сайтом</li>
            <li>Деловые вопросы или партнёрство</li>
            <li>Общая обратная связь</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Время ответа</h2>
          <p>
            DealsHub ведётся одним человеком, поэтому ответ может занять день-два. Мы читаем каждое
            письмо и стараемся отвечать как можно быстрее.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/ru/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Назад на DealsHub</Link>
      </div>
    </article>
  );
}
