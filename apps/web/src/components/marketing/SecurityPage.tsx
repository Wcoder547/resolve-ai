"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Lock, ShieldCheck, Eye, KeyRound } from "lucide-react";
import { Button } from "../ui/button";
import { MarketingPageHero, MarketingShell } from "./MarketingShell";
import { SecurityHeroVisual } from "./ProductVisuals";

const items = [
  {
    icon: Lock,
    title: "Tenant isolation",
    desc: "Knowledge, chats, runs, and usage stay in your org.",
  },
  {
    icon: KeyRound,
    title: "Auth & sessions",
    desc: "JWT access, hashed refresh, email verify, revoke.",
  },
  {
    icon: ShieldCheck,
    title: "RBAC",
    desc: "Owner, Admin, Support, Developer, Viewer permissions.",
  },
  {
    icon: Eye,
    title: "Auditability",
    desc: "Audit logs plus full agent step timelines.",
  },
];

export function SecurityPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Security"
        title="Governed AI — not shadow bots."
        description="Humans in the loop. Every grounded answer inspectable."
        actions={
          <Button
            size="lg"
            className="h-12 rounded-full bg-primary px-7 text-primary-foreground"
            onClick={() => router.push("/register")}
          >
            Create a secure workspace
            <ArrowRight className="size-4" />
          </Button>
        }
        visual={<SecurityHeroVisual />}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="cr-panel p-7 sm:p-8">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-signal-soft">
                  <Icon className="size-5 text-signal" />
                </div>
                <h2 className="font-display mb-2 text-xl font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="text-[15px] text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}
