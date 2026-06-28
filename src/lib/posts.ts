import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";

export type Lang = "en" | "el" | "ru";

const postsDir = (lang: Lang) =>
  path.join(process.cwd(), "posts", lang);

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  image?: string;
};

export type Post = PostMeta & { content: string };

export function getAllPosts(lang: Lang = "en"): PostMeta[] {
  const dir = postsDir(lang);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return { slug, ...(data as Omit<PostMeta, "slug">) };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string, lang: Lang = "en"): Promise<Post> {
  const raw = fs.readFileSync(path.join(postsDir(lang), `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkGfm).use(html).process(content);
  return {
    slug,
    content: processed.toString(),
    ...(data as Omit<PostMeta, "slug">),
  };
}
