import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/AboutPage";

export const metadata: Metadata = {
  title: "About",
  description: "Why ResolveAI builds grounded, governed support AI.",
};

export default function Page() {
  return <AboutPage />;
}
