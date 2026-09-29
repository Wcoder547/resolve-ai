import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/ContactPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the ResolveAI team about sales, security, or product.",
};

export default function Page() {
  return <ContactPage />;
}
