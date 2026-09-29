import type { Metadata } from "next";
import { ChangelogPage } from "@/components/marketing/ChangelogPage";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What shipped in ResolveAI — product updates newest first.",
};

export default function Page() {
  return <ChangelogPage />;
}
