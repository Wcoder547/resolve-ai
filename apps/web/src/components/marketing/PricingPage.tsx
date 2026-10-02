"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { PricingHeroVisual } from "./ProductVisuals";

const freeFeatures = [
  "100 AI requests / day",
  "100K tokens / day · 1M tokens / month",
  "Knowledge base + grounded chat with citations",
  "Multi-agent runs & human tool approvals",
  "Integrations, audit logs & usage analytics",
  "No credit card required",
];

export function PricingPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Free for everyone."
        description="ResolveAI is completely free. Generous usage limits keep the platform sustainable — no paid tiers, no card required."
        visual={<PricingHeroVisual />}
      />

      <section className="pb-16">
        <div className="mx-auto max-w-lg px-5 sm:px-8">
          <div className="cr-panel flex flex-col border-brand p-8 ring-1 ring-brand/30">
            <div className="mb-1 text-sm font-semibold text-brand">Free</div>
            <div className="mb-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight">
                $0
              </span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Full workspace for support and incident teams evaluating grounded
              AI.
            </p>
            <ul className="mb-8 flex-1 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-signal" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => router.push("/register")}
            >
              Start free
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Usage limits apply per workspace to keep AI costs sustainable. There
            are no Pro or Team upgrades.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
