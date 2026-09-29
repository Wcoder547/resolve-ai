import type { Metadata } from "next";
import { PrivacyPage } from "@/components/marketing/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ResolveAI handles account and workspace data.",
};

export default function Page() {
  return <PrivacyPage />;
}
