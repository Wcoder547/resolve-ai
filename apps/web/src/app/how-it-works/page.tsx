import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/marketing/HowItWorksPage";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From knowledge upload to grounded answers and human tool approvals — how ResolveAI works.",
};

export default function Page() {
  return <HowItWorksPage />;
}
