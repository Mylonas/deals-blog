import RootShell, { baseMetadata } from "@/components/RootShell";

export const metadata = baseMetadata("el");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="el">{children}</RootShell>;
}
