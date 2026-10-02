"use client";

import { MarketingPageHero, MarketingShell } from "./MarketingShell";

export function PrivacyPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How ResolveAI handles account and workspace data. Placeholder for launch review."
      />
      <section className="pb-24">
        <div className="prose-legal mx-auto max-w-3xl space-y-8 px-5 text-[15px] leading-relaxed text-muted-foreground sm:px-8">
          <p>
            <strong className="text-foreground">Last updated:</strong> March 5,
            2026
          </p>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              ResolveAI (“we”, “us”) provides a multi-tenant SaaS workspace for
              grounded AI support. This policy describes what we collect, why we
              collect it, and the choices available to you. This is a readable
              placeholder intended for product demos — replace with counsel-reviewed
              terms before production launch.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              2. Data we process
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Account data: name, email, password hashes, organization membership
                and role.
              </li>
              <li>
                Workspace content: knowledge documents, chat messages, agent runs,
                tool approval decisions, and usage metrics scoped to your
                organization.
              </li>
              <li>
                Technical logs: authentication events, API errors, and audit
                records for sensitive actions.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              3. How we use data
            </h2>
            <p>
              We use data to operate the product (authentication, retrieval,
              agent execution, usage limits), improve reliability, and meet
              security obligations. Organization content is not used to train
              public foundation models.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              4. Sharing
            </h2>
            <p>
              We may use infrastructure and AI providers under contract to process
              requests on your behalf. We do not sell personal data. Legal
              disclosure may occur if required by law.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              5. Retention & security
            </h2>
            <p>
              Data is retained while your workspace is active and as needed for
              security and legal requirements. Access is protected with
              authentication, org tenancy, and role-based permissions. Contact us
              to request deletion of an account where legally permitted.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              6. Contact
            </h2>
            <p>
              Questions:{" "}
              <a href="mailto:privacy@resolveai.app" className="text-brand hover:underline">
                privacy@resolveai.app
              </a>{" "}
              or use the{" "}
              <a href="/contact" className="text-brand hover:underline">
                contact form
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
