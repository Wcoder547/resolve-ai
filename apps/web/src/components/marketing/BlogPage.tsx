"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";

const posts = [
  {
    slug: "grounded-vs-generic",
    title: "Grounded answers vs. generic chatbots",
    date: "Mar 12, 2026",
    excerpt:
      "Why citations and retrieval beats pasting runbooks into a public model.",
    tag: "Product",
  },
  {
    slug: "approvals-as-a-feature",
    title: "Approvals aren’t friction — they’re the product",
    date: "Feb 28, 2026",
    excerpt:
      "How human gates for tool calls keep AI useful without shadow automation.",
    tag: "Safety",
  },
  {
    slug: "agent-traces",
    title: "Why every agent run needs a timeline",
    date: "Feb 10, 2026",
    excerpt:
      "Triage → retrieval → tools → QA: what to show support leads and auditors.",
    tag: "Observability",
  },
];

export function BlogPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Blog"
        title="Notes on grounded support AI."
        description="Short posts on product, safety, and how teams run ResolveAI."
      />

      <section className="pb-24">
        <div className="mx-auto max-w-7xl space-y-4 px-5 sm:px-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="cr-panel group flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 font-medium text-accent-foreground">
                    {post.tag}
                  </span>
                  <time>{post.date}</time>
                </div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
              </div>
              <Link
                href={`/blog#${post.slug}`}
                id={post.slug}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand group-hover:underline"
              >
                Read <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-5 text-center text-xs text-muted-foreground sm:px-8">
          Sample posts for launch — full CMS not wired yet.
        </p>
      </section>
    </MarketingShell>
  );
}
