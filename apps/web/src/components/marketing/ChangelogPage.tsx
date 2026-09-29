"use client";

import { MarketingPageHero, MarketingShell } from "./MarketingShell";

const entries = [
  {
    version: "0.4.0",
    date: "Mar 2026",
    items: [
      "Marketing site expanded (about, blog, changelog, contact, legal).",
      "Auth pages: back-to-home navigation + shared AuthShell.",
      "Pricing aligned to Free / Pro / Team usage plans.",
    ],
  },
  {
    version: "0.3.0",
    date: "Feb 2026",
    items: [
      "Email verification and password reset flows.",
      "Organization invites and member RBAC surfaces.",
      "Agent runs dashboard and tool approvals.",
    ],
  },
  {
    version: "0.2.0",
    date: "Jan 2026",
    items: [
      "Knowledge ingest + grounded chat.",
      "Usage limits by plan.",
      "Light/dark CodeRabbit-inspired theme.",
    ],
  },
];

export function ChangelogPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Changelog"
        title="What shipped."
        description="Product updates for ResolveAI — newest first."
      />

      <section className="pb-24">
        <div className="mx-auto max-w-3xl space-y-8 px-5 sm:px-8">
          {entries.map((entry) => (
            <div key={entry.version} className="relative border-l-2 border-brand/40 pl-6">
              <div className="absolute -left-[7px] top-1 size-3 rounded-full bg-brand" />
              <div className="mb-2 flex flex-wrap items-baseline gap-3">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {entry.version}
                </h2>
                <span className="text-sm text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
