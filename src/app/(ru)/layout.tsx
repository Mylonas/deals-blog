import RootShell, { baseMetadata } from "@/components/RootShell";

export const metadata = baseMetadata("ru");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ru">{children}</RootShell>;
}
