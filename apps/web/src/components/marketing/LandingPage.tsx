"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingShell } from "./MarketingShell";
import { GradientMesh } from "./MarketingVisuals";
import { TrustMarquee } from "./TrustMarquee";
import {
  CapabilityShowcase,
  CtaStageVisual,
  FlowStoryVisual,
  HeroProductVisual,
  WhyTeamsVisual,
} from "./ProductVisuals";

export function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <MarketingShell>
      <section
        className={`relative overflow-hidden border-b border-border transition-all duration-700 ${
          ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <GradientMesh />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-signal">
              ResolveAI
            </p>
            <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-balance text-foreground sm:text-6xl lg:text-[4rem]">
              Grounded support AI.
              <span className="block text-brand"> Not guesswork.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Citations. Approvals. Full agent traces.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 rounded-full bg-primary px-7 text-base text-primary-foreground hover:bg-primary/90"
                onClick={() => router.push("/register")}
              >
                Try it for free
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-border bg-card/80 px-7 text-base backdrop-blur"
                onClick={() => router.push("/product")}
              >
                See product
              </Button>
            </div>
          </div>

          <div
            className={`mt-14 sm:mt-18 transition-all delay-150 duration-700 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <HeroProductVisual />
          </div>
        </div>
      </section>

      <TrustMarquee />

      <section className="relative border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-signal">
                Product
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Built to show its work.
              </h2>
            </div>
            <Link
              href="/product"
              className="hidden items-center gap-1.5 text-sm font-medium text-brand hover:underline sm:inline-flex"
            >
              Overview <ArrowRight className="size-4" />
            </Link>
          </div>
          <CapabilityShowcase />
        </div>
      </section>

      <section className="relative border-b border-border bg-card/30 py-20 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 50% 40% at 50% 0%, color-mix(in srgb, var(--brand) 12%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-signal">
                Flow
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ingest. Index. Resolve.
              </h2>
            </div>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              Full flow <ArrowRight className="size-4" />
            </Link>
          </div>
          <FlowStoryVisual />
        </div>
      </section>

      <section className="border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="font-display mb-10 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Why teams pick ResolveAI
          </h2>
          <WhyTeamsVisual />
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card min-h-[280px] sm:min-h-[320px]">
            <GradientMesh className="opacity-80" />
            <CtaStageVisual />
            <div className="relative flex h-full min-h-[280px] flex-col justify-center gap-8 p-10 sm:min-h-[320px] sm:p-14 lg:max-w-[55%]">
              <div>
                <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-signal">
                  Get started
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]">
                  Ship grounded support today.
                </h2>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                  Free workspace. No card required.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-brand px-8 text-base text-brand-foreground hover:bg-brand/90"
                  onClick={() => router.push("/register")}
                >
                  Start free
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-border bg-background/60 backdrop-blur"
                  onClick={() => router.push("/pricing")}
                >
                  View pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
