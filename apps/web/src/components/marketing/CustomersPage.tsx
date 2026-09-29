"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { CustomersHeroVisual } from "./ProductVisuals";

const stories = [
  {
    company: "Northline Support",
    quote:
      "We stopped pasting runbooks into ChatGPT. ResolveAI cites our docs and blocks risky tools until a lead approves.",
    role: "Head of Support",
    metric: "Cited answers",
  },
  {
    company: "Cascade Ops",
    quote:
      "Agent Runs gave us the audit trail compliance asked for — every step from triage to resolution.",
    role: "SRE Manager",
    metric: "Full traces",
  },
  {
    company: "Helix Product",
    quote:
      "New agents ramp faster because answers point at the exact chunk in our knowledge base.",
    role: "Support Enablement",
    metric: "Faster ramp",
  },
];

export function CustomersPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Customers"
        title="Teams that refuse uncited AI."
        description="Support, ops, and product orgs when answers must be grounded."
        actions={
          <Button
            size="lg"
            className="h-12 rounded-full bg-primary px-7 text-primary-foreground"
            onClick={() => router.push("/register")}
          >
            Join them
            <ArrowRight className="size-4" />
          </Button>
        }
        visual={<CustomersHeroVisual />}
      />

      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-3">
          {stories.map((s) => (
            <blockquote
              key={s.company}
              className="cr-panel relative flex flex-col overflow-hidden p-7"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--brand) 40%, transparent), transparent)",
                }}
              />
              <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-brand">
                {s.metric}
              </div>
              <p className="relative flex-1 text-[15px] leading-relaxed text-foreground">
                “{s.quote}”
              </p>
              <footer className="relative mt-6 border-t border-border pt-4">
                <div className="font-semibold text-foreground">{s.company}</div>
                <div className="text-sm text-muted-foreground">{s.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-5 text-center text-xs text-muted-foreground sm:px-8">
          Illustrative customer stories for product demos.
        </p>
      </section>
    </MarketingShell>
  );
}
