import type { Metadata } from "next";
import { BlogPage } from "@/components/marketing/BlogPage";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on grounded support AI from the ResolveAI team.",
};

export default function Page() {
  return <BlogPage />;
}
