import type { Metadata } from "next";
import { SecurityPage } from "@/components/marketing/SecurityPage";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Tenant isolation, RBAC, verified auth, approvals, and auditability in ResolveAI.",
};

export default function Page() {
  return <SecurityPage />;
}
