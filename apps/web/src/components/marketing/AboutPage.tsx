"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { GraphicMark, GradientMesh } from "./MarketingVisuals";

export function AboutPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="About"
        title="We build AI that shows its work."
        description="ResolveAI exists for teams that can’t ship uncited answers into customer conversations."
        actions={
          <Button
            size="lg"
            className="h-12 rounded-full bg-primary px-7 text-primary-foreground"
            onClick={() => router.push("/register")}
          >
            Create a workspace
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      <section className="relative border-b border-border py-16 sm:py-20">
        <GradientMesh className="opacity-40" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[200px_1fr] lg:items-start">
          <GraphicMark variant="orbit" className="size-28" />
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Mission
            </h2>
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Support and ops teams need AI that retrieves from their own knowledge,
              cites sources, and waits for humans before taking risky actions. We
              build that loop — knowledge, grounded chat, agent traces, approvals —
              as one product surface.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { t: "Grounded", d: "Citations by default" },
                { t: "Governed", d: "Approvals for tools" },
                { t: "Observable", d: "Full agent timelines" },
              ].map((item) => (
                <div key={item.t} className="cr-panel p-5">
                  <div className="font-semibold text-foreground">{item.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="font-display mb-6 text-3xl font-semibold tracking-tight">
            Who we’re for
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Support leads", "SRE / Ops", "Product ops", "Enablement"].map(
              (role) => (
                <li
                  key={role}
                  className="rounded-xl border border-border bg-card px-5 py-4 text-sm font-medium text-foreground"
                >
                  {role}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
