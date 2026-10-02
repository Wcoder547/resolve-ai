"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Shield } from "lucide-react";
import { FloatCard, IsoStage } from "./MarketingVisuals";

const ORANGE = "#FF6A2B";
const MINT = "#34D399";

function MiniLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect width="20" height="20" rx="5" fill={ORANGE} />
      <path
        d="M5.5 10.5L8.8 13.8L14.5 7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SourceChip({
  name,
  chunk,
  score,
}: {
  name: string;
  chunk: string;
  score: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.06)] px-3 py-1.5">
      <svg width="12" height="13" viewBox="0 0 13 15" fill="none" aria-hidden className="shrink-0">
        <rect x="1" y="1" width="11" height="13" rx="2" stroke={MINT} strokeWidth="1.2" />
        <path d="M3.5 5H9.5M3.5 8H9.5M3.5 11H6.5" stroke={MINT} strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-white/85">{name}</div>
        <div className="mt-0.5 text-[10px] text-white/35">
          Chunk {chunk} · <span className="font-bold text-[#34D399]">{score}</span>
        </div>
      </div>
    </div>
  );
}

/** Dominant landing hero — grounded ResolveAI answer card from Figma. */
export function HeroProductVisual() {
  return (
    <IsoStage className="mx-auto w-full max-w-3xl">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[8%] -top-6 h-40 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,106,43,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="relative overflow-hidden rounded-[18px] border border-white/[0.08] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]"
          style={{
            background: "linear-gradient(160deg,#161618 0%,#111113 100%)",
          }}
        >
          {/* chrome */}
          <div className="flex items-center gap-3 border-b border-white/[0.055] bg-[#121214] px-4 py-3 sm:px-5">
            <div className="flex gap-1.5">
              {["#FF5F57", "#FEBC2E", "#28C840"].map((bg) => (
                <span key={bg} className="size-2.5 rounded-full" style={{ background: bg }} />
              ))}
            </div>
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                <MiniLogo size={14} />
                <span className="text-[11.5px] font-semibold text-white/75">ResolveAI</span>
              </div>
            </div>
            <span className="rounded-full border border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.10)] px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.09em] text-[#34D399]">
              Grounded
            </span>
          </div>

          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            {/* user */}
            <div className="mb-5 flex justify-end">
              <div className="max-w-[min(100%,420px)] rounded-[14px_14px_4px_14px] border border-[rgba(255,106,43,0.16)] bg-[rgba(255,106,43,0.08)] px-3.5 py-2.5">
                <p className="text-[13px] leading-relaxed text-white/72">
                  How do I request a refund for an annual subscription?
                </p>
              </div>
            </div>

            {/* AI */}
            <div className="mb-4 flex gap-3">
              <div className="mt-0.5 flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-[rgba(255,106,43,0.22)] bg-[rgba(255,106,43,0.12)]">
                <MiniLogo size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/70">ResolveAI</span>
                  <span className="size-1 rounded-full bg-white/25" />
                  <span className="text-[11px] text-white/35">just now</span>
                </div>
                <div className="space-y-2.5 text-[13px] leading-[1.7] text-white/70">
                  <p>
                    Annual subscription refunds are available within{" "}
                    <strong className="font-semibold text-white/90">30 days</strong> of your
                    billing date, per our refund policy.
                  </p>
                  <p className="text-xs text-white/40">To initiate a refund:</p>
                  <ol className="space-y-1.5">
                    {[
                      <>Navigate to <strong className="font-semibold text-white/90">Billing → Subscriptions</strong></>,
                      <>Click <strong className="font-semibold text-white/90">Request Refund</strong></>,
                      <>Select a reason and submit the form</>,
                    ].map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 font-semibold text-[rgba(255,106,43,0.7)]">
                          {i + 1}.
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                  <p>
                    Refunds process in{" "}
                    <strong className="font-semibold text-white/90">5–7 business days</strong>{" "}
                    to your original payment method.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 px-5 pb-4 sm:px-6">
            <SourceChip name="Billing Runbook" chunk="04" score="0.94" />
            <SourceChip name="Refund Policy v3" chunk="02" score="0.89" />
          </div>

          <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5 sm:mx-5">
            <span className="flex-1 text-[12.5px] text-white/20">Ask a follow-up...</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#FF6A2B]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 10L10 6L2 2V5.5L7 6L2 6.5V10Z" fill="white" />
              </svg>
            </div>
          </div>
        </div>

        <FloatCard
          delay={0.5}
          className="absolute -right-1 top-8 z-20 hidden items-center gap-2 px-3 py-2 sm:flex lg:-right-4"
        >
          <CheckCircle2 className="size-3.5 text-signal" />
          <span className="text-[11px] font-medium text-foreground">Grounded · 2 sources</span>
        </FloatCard>
      </div>
    </IsoStage>
  );
}

/** Compact agent-run strip for secondary marketing heroes. */
export function MiniAgentVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 80% 0%, color-mix(in srgb, var(--brand) 18%, transparent), transparent)",
        }}
      />
      <div className="relative flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brand" />
          <span className="font-mono text-[11px] text-muted-foreground">
            agent run
          </span>
        </div>
        <span className="rounded-md bg-signal-soft px-2 py-0.5 font-mono text-[10px] text-signal">
          GROUNDED
        </span>
      </div>
      <div className="relative space-y-2 p-4">
        {["Triage", "Retrieval", "Resolution"].map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              i === 2 ? "bg-brand-soft text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="font-mono text-[10px] opacity-60">0{i + 1}</span>
            {s}
            {i < 2 ? (
              <CheckCircle2 className="ml-auto size-3.5 text-signal" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** How-it-works visual step illustration. */
export function FlowStepVisual({
  step,
}: {
  step: 1 | 2 | 3 | 4;
}) {
  const frames: Record<number, ReactNode> = {
    1: (
      <div className="relative h-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white/70">Upload Knowledge</span>
          <span className="font-mono text-[9px] text-white/30">3 / 5</span>
        </div>
        <div className="mb-2 flex justify-center gap-2">
          {[
            { t: "PDF", c: ORANGE },
            { t: "MD", c: MINT },
            { t: "DOCX", c: "#60A5FA" },
          ].map((f, i) => (
            <span
              key={f.t}
              className="rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold"
              style={{
                color: f.c,
                borderColor: `${f.c}40`,
                background: `${f.c}18`,
                transform: `rotate(${[-6, 0, 6][i]}deg)`,
              }}
            >
              {f.t}
            </span>
          ))}
        </div>
        <div className="flex h-[72px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,106,43,0.35)] bg-[rgba(255,106,43,0.03)]">
          <span className="text-[10px] text-white/35">Drop files here</span>
          <span className="mt-1 text-[9px] text-white/18">PDF · MD · DOCX · TXT</span>
        </div>
      </div>
    ),
    2: (
      <div className="relative h-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] p-3">
        <div className="mb-2 flex justify-between px-1 font-mono text-[8px] uppercase tracking-wider text-white/25">
          <span>Document</span>
          <span>Chunks</span>
          <span>Embed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-14 rounded-lg border border-white/[0.08] bg-[#1A1A1C] p-2">
            <div className="space-y-1">
              {[60, 80, 50].map((w, i) => (
                <div key={i} className="h-1 rounded-full bg-white/15" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-4 gap-1">
            {Array.from({ length: 8 }).map((_, i) => {
              const accent = i % 3 === 0 ? ORANGE : i % 3 === 1 ? MINT : "rgba(255,255,255,0.12)";
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md border"
                  style={{
                    background: accent.startsWith("#") ? `${accent}22` : accent,
                    borderColor: accent.startsWith("#") ? `${accent}45` : "rgba(255,255,255,0.07)",
                  }}
                />
              );
            })}
          </div>
          <svg viewBox="0 0 40 56" className="h-14 w-8" aria-hidden>
            <circle cx="12" cy="12" r="3" fill={ORANGE} />
            <circle cx="28" cy="20" r="2.5" fill={MINT} />
            <circle cx="16" cy="32" r="2.5" fill="rgba(255,255,255,0.35)" />
            <circle cx="30" cy="44" r="3" fill={ORANGE} />
            <path d="M12 15L28 18M14 29L28 22M18 34L28 42" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          </svg>
        </div>
      </div>
    ),
    3: (
      <div className="relative h-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MiniLogo size={12} />
            <span className="text-[10px] font-semibold text-white/70">ResolveAI</span>
          </div>
          <span className="rounded-full border border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.10)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#34D399]">
            Grounded
          </span>
        </div>
        <div className="ml-auto mb-2 max-w-[75%] rounded-xl rounded-br-sm border border-[rgba(255,106,43,0.14)] bg-[rgba(255,106,43,0.08)] px-2 py-1.5 text-[9px] text-white/65">
          How do I request a refund?
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[9px] leading-relaxed text-white/55">
          Within <strong className="text-white/85">30 days</strong> · Billing → Subscriptions
          <div className="mt-1.5 flex gap-1">
            <span className="rounded border border-[rgba(52,211,153,0.14)] bg-[rgba(52,211,153,0.05)] px-1.5 py-0.5 font-mono text-[8px] text-[#34D399]">
              0.94
            </span>
            <span className="rounded border border-[rgba(52,211,153,0.14)] bg-[rgba(52,211,153,0.05)] px-1.5 py-0.5 font-mono text-[8px] text-[#34D399]">
              0.89
            </span>
          </div>
        </div>
      </div>
    ),
    4: (
      <div className="relative h-40 overflow-hidden rounded-2xl border border-border bg-card p-4">
        <div className="flex h-full flex-col justify-center gap-3">
          <div className="rounded-xl border border-brand/30 bg-brand-soft p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-accent-foreground">
              <Shield className="size-3.5" /> Pending tool
            </div>
            <div className="flex gap-2">
              <div className="h-7 flex-1 rounded-lg bg-signal/80" />
              <div className="h-7 flex-1 rounded-lg border border-border bg-card" />
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return <>{frames[step]}</>;
}

/** Product feature visual tiles. */
export function FeatureVisual({
  kind,
}: {
  kind: "knowledge" | "chat" | "agents" | "approvals" | "security";
}) {
  const map = {
    knowledge: (
      <div className="grid grid-cols-3 gap-2 p-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-lg border border-border bg-muted/50"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="m-2 h-1.5 w-3/4 rounded bg-brand/40" />
          </div>
        ))}
      </div>
    ),
    chat: (
      <div className="space-y-2 p-1">
        <div className="ml-auto w-3/4 rounded-2xl rounded-br-md bg-brand/15 px-3 py-2 text-[10px] text-foreground">
          Why is billing inactive?
        </div>
        <div className="w-4/5 rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground">
          Webhook missed · see Billing Runbook
        </div>
      </div>
    ),
    agents: (
      <div className="flex items-end justify-between gap-1.5 px-1 pb-1 pt-3">
        {[40, 65, 50, 90, 70].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-md ${i === 3 ? "bg-brand" : "bg-muted"}`}
              style={{ height: `${h * 0.7}px` }}
            />
          </div>
        ))}
      </div>
    ),
    approvals: (
      <div className="flex h-full items-center justify-center gap-2 p-2">
        <div className="h-10 w-16 rounded-xl bg-signal/80" />
        <div className="h-10 w-16 rounded-xl border border-border bg-card" />
      </div>
    ),
    security: (
      <svg viewBox="0 0 120 80" className="h-full w-full p-2" aria-hidden>
        <path
          d="M60 12L92 24V42C92 58 74 70 60 76C46 70 28 58 28 42V24L60 12Z"
          className="fill-signal/10 stroke-signal/50"
          strokeWidth="1.5"
        />
        <path
          d="M48 42L56 50L74 32"
          className="stroke-signal"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div className="mb-5 h-28 overflow-hidden rounded-xl border border-border bg-muted/30">
      {map[kind]}
    </div>
  );
}

/** Pricing page header visual — free product only. */
export function PricingHeroVisual() {
  return (
    <div className="relative mx-auto mt-10 h-36 max-w-lg sm:h-44">
      <div className="absolute left-1/2 top-4 h-28 w-[70%] -translate-x-1/2 rotate-[-4deg] rounded-2xl border border-border bg-card opacity-60 shadow-lg sm:h-32" />
      <div className="absolute left-1/2 top-2 h-28 w-[75%] -translate-x-1/2 rotate-[2deg] rounded-2xl border border-border bg-card opacity-80 shadow-xl sm:h-32" />
      <div className="absolute left-1/2 top-0 flex h-28 w-[80%] -translate-x-1/2 flex-col items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-card shadow-[0_24px_60px_-20px_rgba(255,106,43,0.35)] sm:h-32">
        <div className="size-10 rounded-full bg-brand" />
        <div className="text-sm font-semibold text-foreground">Free forever</div>
        <div className="text-[11px] text-muted-foreground">No Pro or Team upgrades</div>
      </div>
    </div>
  );
}

/** Security vault visual. */
export function SecurityHeroVisual() {
  return (
    <div className="relative mx-auto mt-8 flex h-44 max-w-md items-center justify-center sm:h-52">
      <div className="absolute size-40 rounded-full border border-dashed border-border sm:size-48" />
      <div className="absolute size-28 rounded-full border border-signal/30 bg-signal/5 sm:size-36" />
      <svg viewBox="0 0 80 90" className="relative z-10 size-24 sm:size-28" aria-hidden>
        <path
          d="M40 8L68 20V42C68 62 50 76 40 82C30 76 12 62 12 42V20L40 8Z"
          className="fill-card stroke-signal"
          strokeWidth="2"
        />
        <rect x="30" y="38" width="20" height="22" rx="3" className="fill-signal/20 stroke-signal" strokeWidth="1.5" />
        <circle cx="40" cy="46" r="3" className="fill-signal" />
        <path d="M40 49V54" className="stroke-signal" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <FloatCard delay={0.4} className="absolute -right-2 top-6 px-3 py-2 text-[10px] font-medium sm:right-0">
        RBAC · Audit
      </FloatCard>
      <FloatCard delay={1} className="absolute -left-2 bottom-8 px-3 py-2 text-[10px] font-medium sm:left-0">
        Tenant isolation
      </FloatCard>
    </div>
  );
}

/** Customers collage visual. */
export function CustomersHeroVisual() {
  return (
    <div className="relative mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
      {[0, 1, 2].map((i) => (
        <FloatCard
          key={i}
          delay={i * 0.35}
          className={`p-4 ${i === 1 ? "translate-y-3 sm:translate-y-5" : ""}`}
        >
          <div
            className={`mb-3 size-8 rounded-lg ${
              i === 0 ? "bg-brand" : i === 1 ? "bg-signal" : "bg-muted"
            }`}
          />
          <div className="mb-2 h-2 w-full rounded bg-muted" />
          <div className="h-2 w-2/3 rounded bg-muted" />
        </FloatCard>
      ))}
    </div>
  );
}

/** 01 INGEST — Upload Knowledge card (Figma storyboard). */
export function IngestMockPanel() {
  const chips = [
    { ext: "PDF", color: ORANGE, rot: -8 },
    { ext: "MD", color: MINT, rot: 0 },
    { ext: "DOCX", color: "#60A5FA", rot: 8 },
  ];
  const files = [
    { name: "billing_runbook.pdf", done: true },
    { name: "refund_policy_v3.pdf", done: true },
    { name: "payment_faq.md", done: false, pct: 72 },
  ];

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] shadow-[0_28px_70px_-36px_rgba(0,0,0,0.55)]"
      style={{ background: "linear-gradient(160deg,#161618 0%,#111113 100%)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 70%, rgba(255,106,43,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-2.5 border-b border-white/[0.055] px-4 py-3.5">
        <div className="flex size-[30px] items-center justify-center rounded-lg border border-[rgba(255,106,43,0.20)] bg-[rgba(255,106,43,0.12)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 11V3M5 6L8 3L11 6" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13H13" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white/80">Upload Knowledge</span>
        <span className="ml-auto font-mono text-[10.5px] text-white/25">3 / 5 files</span>
      </div>

      <div className="relative flex h-12 items-end justify-center gap-3 px-4 pt-3">
        {chips.map((f) => (
          <div
            key={f.ext}
            className="flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            style={{
              transform: `rotate(${f.rot}deg)`,
              background: `${f.color}1F`,
              borderColor: `${f.color}40`,
            }}
          >
            <svg width="12" height="14" viewBox="0 0 13 16" fill="none" aria-hidden>
              <rect x="1" y="1" width="11" height="14" rx="2" stroke={f.color} strokeWidth="1.3" />
              <path d="M3.5 5H9.5M3.5 8H9.5M3.5 11H7" stroke={f.color} strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-[10px] font-bold" style={{ color: f.color }}>
              {f.ext}
            </span>
          </div>
        ))}
      </div>

      <div className="relative mx-4 mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(255,106,43,0.35)] bg-[rgba(255,106,43,0.025)] px-4 py-7">
        <div className="flex size-11 items-center justify-center rounded-[14px] border border-[rgba(255,106,43,0.18)] bg-[rgba(255,106,43,0.10)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 16V8M9 11L12 8L15 11" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 20H19" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[13px] font-medium text-white/35">Drop files here or click to browse</span>
        <span className="text-[11px] text-white/18">PDF · MD · DOCX · TXT</span>
      </div>

      <div className="relative px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/30">Processing</span>
          <span className="font-mono text-[11px] font-semibold text-[#FF6A2B]">68%</span>
        </div>
        <div className="mb-3.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{
              width: "68%",
              background: "linear-gradient(90deg, #FF6A2B, rgba(255,106,43,0.7))",
            }}
          />
        </div>
        <div className="space-y-2">
          {files.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5">
              <div
                className="flex size-4 shrink-0 items-center justify-center rounded-full border"
                style={{
                  background: p.done ? "rgba(52,211,153,0.15)" : "rgba(255,106,43,0.12)",
                  borderColor: p.done ? "rgba(52,211,153,0.30)" : "rgba(255,106,43,0.25)",
                }}
              >
                {p.done ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                    <path d="M1.5 4L3.2 5.7L6.5 2.5" stroke={MINT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="size-1.5 rounded-full bg-[#FF6A2B]" />
                )}
              </div>
              <span
                className={`flex-1 truncate font-mono text-[10.5px] ${
                  p.done ? "text-white/45" : "text-white/70"
                }`}
              >
                {p.name}
              </span>
              {!p.done ? (
                <div className="h-0.5 w-14 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#FF6A2B]" style={{ width: `${p.pct}%` }} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CHUNK_TILES = [
  ORANGE, MINT, "rgba(255,255,255,0.12)", MINT,
  "rgba(255,255,255,0.08)", ORANGE, "rgba(255,255,255,0.12)", "rgba(255,255,255,0.08)",
  ORANGE, "rgba(255,255,255,0.10)", MINT, "rgba(255,255,255,0.08)",
  "rgba(255,255,255,0.12)", ORANGE, "rgba(255,255,255,0.10)", MINT,
];

/** 02 INDEX — Document → Chunks → Embeddings flow. */
export function IndexMockPanel() {
  const dots = [
    { x: 78, y: 18 }, { x: 92, y: 32 }, { x: 105, y: 22 },
    { x: 86, y: 48 }, { x: 100, y: 58 }, { x: 74, y: 62 },
    { x: 94, y: 74 }, { x: 108, y: 80 }, { x: 82, y: 88 },
    { x: 98, y: 96 }, { x: 112, y: 40 }, { x: 68, y: 46 },
  ];
  const colors = [ORANGE, MINT, "rgba(255,255,255,0.35)", MINT, ORANGE, "rgba(255,255,255,0.35)", ORANGE, "rgba(255,255,255,0.25)", MINT, "rgba(255,255,255,0.35)", ORANGE, "rgba(255,255,255,0.20)"];

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0A0A0A] shadow-[0_28px_70px_-36px_rgba(0,0,0,0.55)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 55% 50%, rgba(52,211,153,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="relative grid flex-1 grid-cols-[0.85fr_1.15fr_0.9fr] content-center gap-2 p-4 sm:gap-3 sm:p-5">
        <div>
          <p className="mb-2 text-center text-[9px] font-medium uppercase tracking-[0.07em] text-white/22">
            Document
          </p>
          <div
            className="rounded-[14px] border border-white/[0.08] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
            style={{ background: "linear-gradient(160deg,#1A1A1C 0%,#141416 100%)" }}
          >
            <div className="mb-2.5 flex h-20 flex-col justify-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.025] px-2">
              {[60, 80, 50, 70, 40].map((w, i) => (
                <div key={i} className="h-1 rounded-full bg-white/12" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="text-center text-[10px] font-medium text-white/30">Source doc</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.07em] text-white/22">
            Chunks
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {CHUNK_TILES.map((bg, i) => {
              const accent = bg.startsWith("#");
              return (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg border"
                  style={{
                    background: accent ? `${bg}20` : bg,
                    borderColor: accent ? `${bg}45` : "rgba(255,255,255,0.07)",
                    boxShadow: accent ? `0 2px 12px ${bg}30` : undefined,
                  }}
                >
                  {accent ? (
                    <span className="font-mono text-[7px] font-semibold" style={{ color: `${bg}B3` }}>
                      {bg === ORANGE ? `c${String(i).padStart(2, "0")}` : "idx"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.07em] text-white/22">
            Embeddings
          </p>
          <svg viewBox="0 0 120 110" className="h-[120px] w-full" aria-hidden>
            {[[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 10], [5, 6], [6, 7], [7, 8], [8, 9], [10, 11]].map(
              ([a, b], i) => (
                <line
                  key={i}
                  x1={dots[a].x}
                  y1={dots[a].y}
                  x2={dots[b].x}
                  y2={dots[b].y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
              ),
            )}
            {dots.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={i === 0 || i === 4 ? 4.5 : 3}
                fill={colors[i]}
                opacity={i % 3 === 0 ? 1 : 0.75}
              />
            ))}
          </svg>
        </div>
      </div>
      <div className="relative mt-auto flex items-center justify-center gap-6 border-t border-white/[0.04] px-4 py-2.5">
        <span className="font-mono text-[9px] text-[rgba(255,106,43,0.55)]">doc → chunks</span>
        <span className="font-mono text-[9px] text-[rgba(52,211,153,0.55)]">chunks → vectors</span>
      </div>
    </div>
  );
}

/** 03 RESOLVE — grounded answer card with sources + follow-up. */
export function ResolveMockPanel() {
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.075] shadow-[0_28px_70px_-36px_rgba(0,0,0,0.55)]"
      style={{ background: "linear-gradient(160deg,#161618 0%,#111113 100%)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 40% 45%, rgba(52,211,153,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-2.5 border-b border-white/[0.055] px-4 py-3">
        <div className="flex size-6 items-center justify-center rounded-[7px] border border-[rgba(255,106,43,0.24)] bg-[rgba(255,106,43,0.14)]">
          <MiniLogo size={14} />
        </div>
        <span className="text-[12.5px] font-semibold text-white/70">ResolveAI</span>
        <span className="ml-auto rounded-full border border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.10)] px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.09em] text-[#34D399]">
          Grounded
        </span>
      </div>

      <div className="relative flex flex-1 flex-col px-4 pt-4">
        <div className="mb-3.5 flex justify-end">
          <div className="max-w-[85%] rounded-[12px_12px_3px_12px] border border-[rgba(255,106,43,0.14)] bg-[rgba(255,106,43,0.08)] px-3 py-2">
            <p className="text-xs leading-relaxed text-white/72">How do I request a refund?</p>
          </div>
        </div>
        <div className="mb-3 space-y-2.5 text-[12.5px] leading-[1.65] text-white/68">
          <p>
            Annual refunds are available within{" "}
            <strong className="font-semibold text-white/88">30 days</strong> of billing. Navigate
            to <strong className="font-semibold text-white/88">Billing → Subscriptions</strong> and
            select Request Refund.
          </p>
          <p>
            Refunds process in{" "}
            <strong className="font-semibold text-white/88">5–7 business days</strong> to your
            original payment method.
          </p>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <SourceChip name="Billing Runbook" chunk="04" score="0.94" />
          <SourceChip name="Refund Policy v3" chunk="02" score="0.89" />
        </div>
      </div>

      <div className="relative mx-3.5 mb-3.5 mt-auto flex items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-3 py-2">
        <span className="flex-1 text-[11.5px] text-white/16">Ask a follow-up...</span>
        <div className="flex size-6 items-center justify-center rounded-[7px] bg-[#FF6A2B]">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 10L10 6L2 2V5.5L7 6L2 6.5V10Z" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Alias kept for older imports. */
export function GroundMockPanel() {
  return <ResolveMockPanel />;
}

/** Large screenshot-style panel: approval gate. */
export function GateMockPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_70px_-36px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Shield className="size-3.5 text-brand" />
        <span className="font-mono text-[11px] text-muted-foreground">tool · awaiting approval</span>
      </div>
      <div className="p-4">
        <div className="rounded-xl border border-brand/25 bg-brand-soft/60 p-4">
          <div className="mb-1 text-xs font-semibold text-foreground">trigger_activation</div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Risky write · org policy requires human gate
          </p>
          <div className="flex gap-2">
            <span className="flex-1 rounded-lg bg-signal py-2.5 text-center text-xs font-semibold text-brand-foreground dark:text-background">
              Approve
            </span>
            <span className="flex-1 rounded-lg border border-border bg-card py-2.5 text-center text-xs font-medium text-muted-foreground">
              Reject
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-signal" />
          Audit logged · reversible
        </div>
      </div>
    </div>
  );
}

/** Connected Ingest → Index → Resolve storyboard. */
export function FlowStoryVisual() {
  const steps = [
    { n: "01", title: "Ingest", line: "Upload knowledge", panel: <IngestMockPanel /> },
    { n: "02", title: "Index", line: "Chunks → embeddings", panel: <IndexMockPanel /> },
    { n: "03", title: "Resolve", line: "Grounded answers", panel: <ResolveMockPanel /> },
  ];

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-8 lg:block"
        viewBox="0 0 800 32"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 16H800" className="stroke-border" strokeWidth="2" strokeDasharray="6 8" />
        <path
          d="M0 16H800"
          className="stroke-brand/50"
          strokeWidth="2"
          strokeDasharray="120 400"
          style={{ animation: "draw-line 3.5s ease-in-out infinite" }}
        />
      </svg>

      <div className="grid items-stretch gap-8 lg:grid-cols-3 lg:gap-6">
        {steps.map((step, i) => (
          <div
            key={step.n}
            className="relative flex h-full flex-col"
            style={{ animation: `fade-rise 0.7s ease ${0.1 + i * 0.15}s both` }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border border-brand/40 bg-brand-soft font-mono text-xs font-semibold text-brand">
                {step.n}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.line}</p>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">{step.panel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Capability showcase tiles with rich mini-mocks (not icon+text cards). */
export function CapabilityShowcase() {
  const items = [
    {
      title: "Private knowledge",
      line: "Docs in. Citations out.",
      visual: (
        <div className="relative h-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] p-3">
          <div className="absolute inset-0 opacity-70" style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, rgba(255,106,43,0.18), transparent 55%)",
          }} />
          <div className="relative mb-2 flex justify-center gap-2 pt-1">
            {[
              { t: "PDF", c: "#FF6A2B", r: -8 },
              { t: "MD", c: "#34D399", r: 0 },
              { t: "DOCX", c: "#60A5FA", r: 8 },
            ].map((f) => (
              <span
                key={f.t}
                className="rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold"
                style={{
                  color: f.c,
                  borderColor: `${f.c}40`,
                  background: `${f.c}18`,
                  transform: `rotate(${f.r}deg)`,
                }}
              >
                {f.t}
              </span>
            ))}
          </div>
          <div className="relative mx-1 flex h-[72px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,106,43,0.35)] bg-[rgba(255,106,43,0.03)]">
            <span className="text-[10px] text-white/35">Drop files here</span>
            <span className="mt-1 text-[8px] text-white/18">PDF · MD · DOCX · TXT</span>
          </div>
        </div>
      ),
    },
    {
      title: "Grounded chat",
      line: "Answers with sources.",
      visual: (
        <div className="relative h-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="size-3 rounded bg-[#FF6A2B]" />
              <span className="text-[9px] font-semibold text-white/70">ResolveAI</span>
            </div>
            <span className="rounded-full border border-[rgba(52,211,153,0.22)] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#34D399]">
              Grounded
            </span>
          </div>
          <div className="ml-auto mb-1.5 w-3/4 rounded-xl rounded-br-sm border border-[rgba(255,106,43,0.14)] bg-[rgba(255,106,43,0.08)] px-2 py-1 text-[9px] text-white/65">
            How do I request a refund?
          </div>
          <div className="w-[88%] rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[9px] text-white/50">
            Within <strong className="text-white/80">30 days</strong>
            <div className="mt-1 flex gap-1">
              <span className="rounded border border-[rgba(52,211,153,0.14)] px-1 py-0.5 font-mono text-[7px] text-[#34D399]">0.94</span>
              <span className="rounded border border-[rgba(52,211,153,0.14)] px-1 py-0.5 font-mono text-[7px] text-[#34D399]">0.89</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Agent traces",
      line: "Every step visible.",
      visual: (
        <div className="relative h-36 overflow-hidden rounded-xl border border-border bg-muted/30 p-3">
          <ul className="space-y-1.5">
            {["Triage", "Retrieval", "Diagnostic", "Resolution"].map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
                  i === 3 ? "bg-brand-soft font-medium text-accent-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="font-mono opacity-60">0{i + 1}</span>
                {s}
                {i < 3 ? <CheckCircle2 className="ml-auto size-3 text-signal" /> : null}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: "Human approvals",
      line: "Risky tools wait.",
      visual: (
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 p-3">
          <FloatCard delay={0.3} className="w-full max-w-[180px] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold">
              <Shield className="size-3 text-brand" /> Pending
            </div>
            <div className="flex gap-1.5">
              <div className="h-7 flex-1 rounded-md bg-signal/85" />
              <div className="h-7 flex-1 rounded-md border border-border bg-card" />
            </div>
          </FloatCard>
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="group">
          {item.visual}
          <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.line}</p>
        </div>
      ))}
    </div>
  );
}

/** Compact citation answer panel for why-teams. */
function WhyCitationsPanel() {
  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl border border-border bg-muted/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 75% 15%, color-mix(in srgb, var(--signal) 16%, transparent), transparent 65%)",
        }}
      />
      <div className="relative flex items-center justify-between border-b border-border/80 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <MiniLogo size={12} />
          <span className="text-[11px] font-semibold text-foreground/80">ResolveAI</span>
        </div>
        <span className="rounded-full border border-signal/25 bg-signal-soft px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-signal">
          Grounded
        </span>
      </div>
      <div className="relative space-y-2.5 p-3.5">
        <div className="ml-auto max-w-[78%] rounded-[12px_12px_3px_12px] border border-brand/20 bg-brand-soft/70 px-2.5 py-1.5 text-[10px] leading-snug text-foreground/75">
          How do I request a refund?
        </div>
        <div className="rounded-lg border border-border bg-card/90 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
          Within <strong className="font-semibold text-foreground">30 days</strong> of billing.
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { name: "Billing Runbook", score: "0.94" },
              { name: "Refund Policy", score: "0.89" },
            ].map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1.5 rounded-md border border-signal/20 bg-signal-soft/60 px-1.5 py-1"
              >
                <span className="max-w-[88px] truncate text-[9px] font-medium text-foreground/80">
                  {s.name}
                </span>
                <span className="font-mono text-[9px] font-bold text-signal">{s.score}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact approval gate panel for why-teams. */
function WhyApprovalsPanel() {
  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl border border-border bg-muted/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 0%, color-mix(in srgb, var(--brand) 14%, transparent), transparent 65%)",
        }}
      />
      <div className="relative flex items-center gap-2 border-b border-border/80 px-3.5 py-2.5">
        <Shield className="size-3.5 text-brand" />
        <span className="font-mono text-[10px] text-muted-foreground">tool · awaiting approval</span>
        <span className="ml-auto rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-brand">
          Write
        </span>
      </div>
      <div className="relative p-3.5">
        <div className="rounded-xl border border-brand/25 bg-card p-3 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)]">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-foreground">
              trigger_activation
            </span>
          </div>
          <p className="mb-3 text-[10px] leading-snug text-muted-foreground">
            Risky write · org policy requires human gate
          </p>
          <div className="flex gap-2">
            <span className="flex-1 rounded-lg bg-signal py-2 text-center text-[11px] font-semibold text-brand-foreground dark:text-background">
              Approve
            </span>
            <span className="flex-1 rounded-lg border border-border bg-muted/50 py-2 text-center text-[11px] font-medium text-muted-foreground">
              Reject
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CheckCircle2 className="size-3 text-signal" />
          Audit logged · reversible
        </div>
      </div>
    </div>
  );
}

/** Compact tenant-scoped knowledge panel for why-teams. */
function WhyKnowledgePanel() {
  const tenants = [
    { name: "Acme", locked: true, active: false },
    { name: "Your org", locked: false, active: true },
    { name: "North", locked: true, active: false },
  ];

  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl border border-border bg-muted/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 50% 80%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 65%)",
        }}
      />
      <div className="relative flex items-center justify-between border-b border-border/80 px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-foreground/80">Knowledge</span>
        <span className="rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-brand">
          Tenant wall
        </span>
      </div>
      <div className="relative grid h-[calc(100%-41px)] grid-cols-3 gap-2 p-3">
        {tenants.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col overflow-hidden rounded-lg border p-2 ${
              t.active
                ? "border-brand/40 bg-card shadow-[0_10px_28px_-14px_rgba(255,106,43,0.55)]"
                : "border-border/70 bg-card/40 opacity-55"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <span
                className={`truncate text-[9px] font-semibold ${
                  t.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t.name}
              </span>
              {t.locked ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <rect x="2.5" y="5.5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground" />
                  <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground" />
                </svg>
              ) : (
                <span className="size-1.5 rounded-full bg-brand" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {[70, 55, 82].map((w, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full ${t.active ? "bg-brand/45" : "bg-muted-foreground/25"}`}
                  style={{ width: `${w}%` }}
                />
              ))}
              <div
                className={`mt-auto rounded-md border px-1.5 py-1 font-mono text-[8px] ${
                  t.active
                    ? "border-brand/30 bg-brand-soft text-brand"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {t.active ? "12 docs" : "blocked"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact agent run timeline panel for why-teams. */
function WhyObservabilityPanel() {
  const steps = [
    { n: "01", label: "Triage", done: true },
    { n: "02", label: "Retrieval", done: true },
    { n: "03", label: "Diagnostic", done: true },
    { n: "04", label: "Resolution", done: false },
  ];

  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl border border-border bg-muted/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 90% 40%, color-mix(in srgb, var(--signal) 12%, transparent), transparent 65%)",
        }}
      />
      <div className="relative flex items-center justify-between border-b border-border/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand" />
          <span className="font-mono text-[10px] text-muted-foreground">agent run · ar_8f2c</span>
        </div>
        <span className="rounded-md bg-signal-soft px-1.5 py-0.5 font-mono text-[8px] font-semibold text-signal">
          LIVE
        </span>
      </div>
      <ul className="relative space-y-1.5 p-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] ${
              s.done
                ? "text-muted-foreground"
                : "bg-brand-soft font-medium text-accent-foreground"
            }`}
          >
            <span className="w-5 font-mono text-[9px] opacity-60">{s.n}</span>
            <span className="flex-1">{s.label}</span>
            {s.done ? (
              <CheckCircle2 className="size-3.5 text-signal" />
            ) : (
              <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Why-teams illustrated reasons — product mock panels, not tiny chips. */
export function WhyTeamsVisual() {
  const reasons = [
    {
      title: "Citations on every answer",
      line: "Sources scored and attached.",
      accent: "signal" as const,
      panel: <WhyCitationsPanel />,
    },
    {
      title: "Human gate for tools",
      line: "Risky writes wait for approval.",
      accent: "brand" as const,
      panel: <WhyApprovalsPanel />,
    },
    {
      title: "Org-scoped knowledge",
      line: "Tenant walls by default.",
      accent: "brand" as const,
      panel: <WhyKnowledgePanel />,
    },
    {
      title: "Agent observability",
      line: "Every step on a timeline.",
      accent: "signal" as const,
      panel: <WhyObservabilityPanel />,
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {reasons.map((r, i) => (
        <div
          key={r.title}
          className="group relative overflow-hidden rounded-[1.25rem] border border-border bg-card p-3 sm:p-3.5"
          style={{ animation: `fade-rise 0.65s ease ${i * 0.08}s both` }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
            style={{
              background:
                r.accent === "brand"
                  ? "radial-gradient(circle, color-mix(in srgb, var(--brand) 28%, transparent), transparent)"
                  : "radial-gradient(circle, color-mix(in srgb, var(--signal) 26%, transparent), transparent)",
            }}
          />
          <div className="relative">{r.panel}</div>
          <div className="relative px-1.5 pb-1.5 pt-4 sm:px-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
              {r.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dramatic get-started CTA with product preview behind. */
export function CtaStageVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -right-[8%] top-[12%] hidden w-[52%] opacity-40 lg:block"
        style={{
          transform: "perspective(1200px) rotateY(-18deg) rotateX(6deg) scale(0.92)",
        }}
      >
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-2xl">
          <div className="flex h-8 items-center gap-1.5 border-b border-border px-3">
            <span className="size-1.5 rounded-full bg-brand/70" />
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
            <span className="size-1.5 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="space-y-2 p-4">
            {["Triage", "Retrieval", "Resolution"].map((s, i) => (
              <div
                key={s}
                className={`rounded-lg px-3 py-2 text-[10px] ${
                  i === 2 ? "bg-brand-soft text-accent-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
      <FloatCard
        delay={0.5}
        className="absolute bottom-[18%] right-[6%] hidden w-40 p-3 opacity-70 sm:block lg:right-[18%]"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium">
          <CheckCircle2 className="size-3 text-signal" /> Grounded · 3 sources
        </div>
      </FloatCard>
    </div>
  );
}
