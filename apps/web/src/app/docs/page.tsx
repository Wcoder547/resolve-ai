import type { Metadata } from "next";
import { DocsPage } from "@/components/marketing/DocsPage";

export const metadata: Metadata = {
  title: "Docs",
  description: "Getting started guides for ResolveAI product surfaces and the agent pipeline.",
};

export default function Page() {
  return <DocsPage />;
}
