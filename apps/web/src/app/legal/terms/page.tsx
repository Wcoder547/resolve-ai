import type { Metadata } from "next";
import { TermsPage } from "@/components/marketing/TermsPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the ResolveAI service.",
};

export default function Page() {
  return <TermsPage />;
}
