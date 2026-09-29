"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../ui/utils";

/** Soft brand mesh atmosphere for hero / section backgrounds. */
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute -left-[10%] -top-[20%] h-[55%] w-[55%] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 45%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-[5%] top-[10%] h-[40%] w-[40%] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--signal) 35%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] h-[35%] w-[50%] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 25%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "var(--foreground)",
        }}
      />
    </div>
  );
}

/** Floating depth card used in layered product mockups. */
export function FloatCard({
  children,
  className,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/95 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] backdrop-blur-sm",
        "animate-[float-y_6s_ease-in-out_infinite]",
        className,
      )}
      style={{
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Isometric-ish stage for product visuals. */
export function IsoStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate", className)}>
      <div
        aria-hidden
        className="absolute inset-x-[8%] bottom-[6%] h-[18%] rounded-[50%] bg-foreground/10 blur-2xl"
      />
      <div
        className="relative"
        style={{
          transform: "perspective(1400px) rotateX(8deg) rotateY(-6deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Compact SVG icon marks for section headers. */
export function GraphicMark({
  variant = "orbit",
  className,
}: {
  variant?: "orbit" | "stack" | "shield" | "flow" | "nodes";
  className?: string;
}) {
  if (variant === "stack") {
    return (
      <svg viewBox="0 0 64 64" className={cn("size-14", className)} fill="none" aria-hidden>
        <rect x="10" y="28" width="44" height="26" rx="6" className="fill-muted stroke-border" strokeWidth="1.5" />
        <rect x="14" y="18" width="36" height="22" rx="5" className="fill-card stroke-border" strokeWidth="1.5" />
        <rect x="18" y="8" width="28" height="18" rx="4" className="fill-brand/20 stroke-brand/50" strokeWidth="1.5" />
        <circle cx="32" cy="16" r="2.5" className="fill-brand" />
      </svg>
    );
  }
  if (variant === "shield") {
    return (
      <svg viewBox="0 0 64 64" className={cn("size-14", className)} fill="none" aria-hidden>
        <path
          d="M32 6L52 14V30C52 44 40 54 32 58C24 54 12 44 12 30V14L32 6Z"
          className="fill-signal/15 stroke-signal/60"
          strokeWidth="1.5"
        />
        <path d="M24 32L30 38L42 24" className="stroke-signal" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "flow") {
    return (
      <svg viewBox="0 0 64 64" className={cn("size-14", className)} fill="none" aria-hidden>
        <circle cx="12" cy="32" r="6" className="fill-brand/25 stroke-brand" strokeWidth="1.5" />
        <circle cx="32" cy="18" r="6" className="fill-muted stroke-border" strokeWidth="1.5" />
        <circle cx="32" cy="46" r="6" className="fill-muted stroke-border" strokeWidth="1.5" />
        <circle cx="52" cy="32" r="6" className="fill-signal/25 stroke-signal" strokeWidth="1.5" />
        <path d="M18 30L26 22M18 34L26 42M38 22L46 30M38 42L46 34" className="stroke-muted-foreground/50" strokeWidth="1.5" />
      </svg>
    );
  }
  if (variant === "nodes") {
    return (
      <svg viewBox="0 0 64 64" className={cn("size-14", className)} fill="none" aria-hidden>
        <circle cx="20" cy="20" r="5" className="fill-brand" />
        <circle cx="44" cy="18" r="4" className="fill-signal" />
        <circle cx="18" cy="44" r="4" className="fill-muted-foreground" />
        <circle cx="46" cy="46" r="5" className="fill-brand/70" />
        <path d="M24 22L40 20M22 24L20 40M42 22L44 42M22 46L42 48" className="stroke-border" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={cn("size-14", className)} fill="none" aria-hidden>
      <circle cx="32" cy="32" r="22" className="stroke-border" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="32" cy="32" r="12" className="fill-brand/15 stroke-brand/50" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="4" className="fill-brand" />
      <circle cx="52" cy="24" r="3" className="fill-signal" />
    </svg>
  );
}
