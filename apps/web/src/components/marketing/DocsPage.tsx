"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  Settings,
  Shield,
  Terminal,
  Workflow,
} from "lucide-react";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";

const guides = [
  {
    icon: BookOpen,
    title: "Getting started",
    desc: "Register → verify → upload → ask.",
    href: "/how-it-works",
  },
  {
    icon: Workflow,
    title: "Agent pipeline",
    desc: "Triage through QA, end to end.",
    href: "/product#agents",
  },
  {
    icon: MessageSquare,
    title: "Grounded chat",
    desc: "Open AI Chat in your workspace.",
    href: "/chat",
  },
  {
    icon: Shield,
    title: "Approvals",
    desc: "Review pending tool calls.",
    href: "/approvals",
  },
  {
    icon: Settings,
    title: "Workspace settings",
    desc: "Members, plans, providers.",
    href: "/settings",
  },
  {
    icon: Terminal,
    title: "API & Postman",
    desc: "Collections in the repo for engineers.",
    href: "/product",
  },
];

export function DocsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Docs"
        title="Learn the product fast."
        description="Short guides that jump into the app where it helps."
      />

      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.title}
                href={g.href}
                className="cr-panel group p-7 transition-colors hover:border-brand/40"
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-5 text-foreground" />
                </div>
                <h2 className="mb-1 text-lg font-semibold text-foreground group-hover:text-brand">
                  {g.title}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">{g.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                  Open <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}
