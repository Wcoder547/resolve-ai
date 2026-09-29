"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { FeatureVisual } from "./ProductVisuals";

const features = [
  {
    id: "knowledge",
    kind: "knowledge" as const,
    title: "Knowledge base",
    desc: "Upload, ingest, retrieve — with hybrid search.",
  },
  {
    id: "chat",
    kind: "chat" as const,
    title: "Grounded chat",
    desc: "Natural questions. Cited answers.",
  },
  {
    id: "agents",
    kind: "agents" as const,
    title: "Multi-agent resolution",
    desc: "Triage → retrieval → tools → QA, persisted.",
  },
  {
    id: "approvals",
    kind: "approvals" as const,
    title: "Human approvals",
    desc: "Risky tools pause until you decide.",
  },
  {
    id: "security",
    kind: "security" as const,
    title: "Workspace security",
    desc: "Tenancy, RBAC, verification, audit logs.",
  },
];

export function ProductPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Product"
        title="The grounded support stack."
        description="Knowledge, chat, agents, and approvals — designed to show its work."
        actions={
          <>
            <Button
              size="lg"
              className="h-12 rounded-full bg-primary px-7 text-primary-foreground"
              onClick={() => router.push("/register")}
            >
              Try it for free
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => router.push("/how-it-works")}
            >
              How it works
            </Button>
          </>
        }
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-2">
          {features.map((f) => (
            <article
              key={f.id}
              id={f.id}
              className="cr-panel scroll-mt-28 overflow-hidden p-6 sm:p-8"
            >
              <FeatureVisual kind={f.kind} />
              <h2 className="font-display mb-2 text-2xl font-semibold tracking-tight">
                {f.title}
              </h2>
              <p className="text-[15px] text-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card/30 py-16">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            See it in your workspace.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Upload a doc, ask a question — Agent Runs and Approvals light up.
          </p>
          <Button
            size="lg"
            className="mt-8 h-12 rounded-full bg-brand px-8 text-brand-foreground hover:bg-brand/90"
            onClick={() => router.push("/register")}
          >
            Start free
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
