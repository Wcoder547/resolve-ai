"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { FlowStepVisual } from "./ProductVisuals";

const flow = [
  {
    n: 1 as const,
    title: "Ingest knowledge",
    detail: "Drop PDF, MD, DOCX, or TXT — files queue as KnowledgeSources.",
  },
  {
    n: 2 as const,
    title: "Index & embed",
    detail: "Documents become chunks, then vectors in your org’s Postgres.",
  },
  {
    n: 3 as const,
    title: "Resolve in chat",
    detail: "Grounded answers with citation chips and follow-ups.",
  },
  {
    n: 4 as const,
    title: "Review & approve",
    detail: "Risky tools wait under Approvals until a human decides.",
  },
];

export function HowItWorksPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="How it works"
        title="From document to decision."
        description="Fast APIs for product work. Slow AI jobs off the critical path."
        actions={
          <Button
            size="lg"
            className="h-12 rounded-full bg-primary px-7 text-primary-foreground"
            onClick={() => router.push("/register")}
          >
            Try the flow
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-5 px-5 sm:px-8">
          {flow.map((step) => (
            <div
              key={step.n}
              className="cr-panel grid gap-6 overflow-hidden p-6 sm:grid-cols-[1fr_280px] sm:items-center sm:gap-10 sm:p-8"
            >
              <div>
                <div className="mb-2 font-mono text-sm font-semibold text-brand">
                  0{step.n}
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {step.title}
                </h2>
                <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
                  {step.detail}
                </p>
              </div>
              <FlowStepVisual step={step.n} />
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
