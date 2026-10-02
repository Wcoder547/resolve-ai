"use client";

import { MarketingPageHero, MarketingShell } from "./MarketingShell";

export function TermsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="Terms governing use of ResolveAI. Placeholder for launch review."
      />
      <section className="pb-24">
        <div className="mx-auto max-w-3xl space-y-8 px-5 text-[15px] leading-relaxed text-muted-foreground sm:px-8">
          <p>
            <strong className="text-foreground">Last updated:</strong> March 5,
            2026
          </p>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              1. Agreement
            </h2>
            <p>
              By creating a ResolveAI account or using the service, you agree to
              these Terms. If you use ResolveAI on behalf of an organization, you
              represent that you have authority to bind that organization. This
              document is a readable placeholder — replace with counsel-reviewed
              terms before production launch.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              2. The service
            </h2>
            <p>
              ResolveAI provides workspace features including knowledge
              management, grounded AI chat, agent runs, approvals, analytics, and
              related settings. Features marked as preview may change or be
              unavailable. Usage is subject to plan limits published in the
              product.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              3. Accounts & acceptable use
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Keep credentials secure and verify your email when required.</li>
              <li>
                Do not attempt to access other tenants’ data, abuse rate limits, or
                use the service for unlawful activity.
              </li>
              <li>
                You are responsible for content uploaded to your workspace and for
                decisions made from AI suggestions.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              4. AI outputs
            </h2>
            <p>
              AI answers may be incorrect or incomplete even when citations are
              shown. ResolveAI does not guarantee outcomes. You remain responsible
              for reviewing outputs and tool approvals before acting on them.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              5. Pricing
            </h2>
            <p>
              ResolveAI is free for all workspaces. Usage may be limited per
              organization to keep the service sustainable. There are no paid
              plan upgrades.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              6. Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, ResolveAI and its suppliers
              are not liable for indirect, incidental, or consequential damages,
              or for lost profits or data arising from use of the service.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              7. Contact
            </h2>
            <p>
              Legal questions:{" "}
              <a href="mailto:legal@resolveai.app" className="text-brand hover:underline">
                legal@resolveai.app
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
