import Link from "next/link";
import { MarketingShell, ResolveMark } from "@/components/marketing/MarketingShell";

export default function NotFound() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% -10%, color-mix(in srgb, var(--brand) 16%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
          <ResolveMark className="mb-6 size-12" />
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-signal">
            404
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            That route doesn&apos;t exist — or it moved. Head home or open the
            product overview.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              Back to home
            </Link>
            <Link
              href="/product"
              className="inline-flex h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground"
            >
              Product
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground"
            >
              Docs
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
