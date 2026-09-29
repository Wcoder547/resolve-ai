"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { PricingHeroVisual } from "./ProductVisuals";

const plans = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "",
    blurb: "Evaluate with a small team.",
    cta: "Start free",
    href: "/register",
    features: [
      "100 AI requests / day",
      "100K tokens / day",
      "Knowledge + grounded chat",
      "Agent runs & basic limits",
    ],
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$49",
    period: "/mo",
    blurb: "Active support and higher limits.",
    cta: "Start Pro",
    href: "/register",
    features: [
      "1,000 requests / day",
      "1M tokens / day",
      "Approvals workflow",
      "Integrations & audit logs",
    ],
    highlight: true,
  },
  {
    id: "TEAM",
    name: "Team",
    price: "$149",
    period: "/mo",
    blurb: "Larger workspaces, heavier usage.",
    cta: "Start Team",
    href: "/register",
    features: [
      "5,000 requests / day",
      "5M tokens / day",
      "Higher monthly token pool",
      "Priority evaluation support",
    ],
    highlight: false,
  },
];

const comparison = [
  { feature: "Daily AI requests", free: "100", pro: "1,000", team: "5,000" },
  { feature: "Daily tokens", free: "100K", pro: "1M", team: "5M" },
  { feature: "Monthly tokens", free: "1M", pro: "10M", team: "50M" },
  { feature: "Knowledge base", free: "✓", pro: "✓", team: "✓" },
  { feature: "Grounded chat", free: "✓", pro: "✓", team: "✓" },
  { feature: "Tool approvals", free: "—", pro: "✓", team: "✓" },
  { feature: "Audit logs", free: "—", pro: "✓", team: "✓" },
];

export function PricingPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Plans that match your usage."
        description="Free → Pro → Team. Switch tiers in Settings while billing is evaluated."
        visual={<PricingHeroVisual />}
      />

      <section className="pb-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`cr-panel flex flex-col p-8 ${
                plan.highlight ? "border-brand ring-1 ring-brand/30" : ""
              }`}
            >
              <div className="mb-1 text-sm font-semibold text-brand">{plan.name}</div>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-muted-foreground">{plan.period}</span>
                ) : null}
              </div>
              <p className="mb-6 text-sm text-muted-foreground">{plan.blurb}</p>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-signal" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full rounded-full ${
                  plan.highlight
                    ? "bg-brand text-brand-foreground hover:bg-brand/90"
                    : "bg-primary text-primary-foreground"
                }`}
                onClick={() => router.push(plan.href)}
              >
                {plan.cta}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border pb-24 pt-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="font-display mb-6 text-2xl font-semibold tracking-tight">
            Feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 font-medium">Free</th>
                  <th className="px-4 py-3 font-medium">Pro</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.free}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.pro}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Stripe billing is not wired yet — owners can switch plan tiers in
            Settings for product evaluation.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
