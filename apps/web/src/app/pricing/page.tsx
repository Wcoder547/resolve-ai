import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description: "ResolveAI is completely free — grounded AI support with usage limits, no paid tiers.",
};

export default function Page() {
  return <PricingPage />;
}
