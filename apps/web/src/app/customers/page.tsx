import type { Metadata } from "next";
import { CustomersPage } from "@/components/marketing/CustomersPage";

export const metadata: Metadata = {
  title: "Customers",
  description: "Support and ops teams using ResolveAI for grounded, approvable AI answers.",
};

export default function Page() {
  return <CustomersPage />;
}
