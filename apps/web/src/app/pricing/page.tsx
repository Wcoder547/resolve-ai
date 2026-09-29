import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple ResolveAI plans for teams evaluating and scaling grounded AI support.",
};

export default function Page() {
  return <PricingPage />;
}
