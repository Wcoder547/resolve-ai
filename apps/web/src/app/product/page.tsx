import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/ProductPage";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Knowledge base, grounded chat, multi-agent resolution, and human approvals in one ResolveAI workspace.",
};

export default function Page() {
  return <ProductPage />;
}
