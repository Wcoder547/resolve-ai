"use client";

import type { ReactNode } from "react";
import { cn } from "../ui/utils";

type EmptyVariant =
  | "knowledge"
  | "chat"
  | "runs"
  | "approvals"
  | "analytics"
  | "inbox"
  | "generic";

function EmptyIllustration({ variant }: { variant: EmptyVariant }) {
  if (variant === "knowledge") {
    return (
      <img
        src="/brand/empty/knowledge-empty.svg"
        alt=""
        width={112}
        height={112}
        className="mx-auto size-[112px] object-contain dark:opacity-100 opacity-90"
        draggable={false}
      />
    );
  }

  if (variant === "chat") {
    return (
      <img
        src="/brand/empty/chat-empty.svg"
        alt=""
        width={112}
        height={112}
        className="mx-auto size-[112px] object-contain dark:opacity-100 opacity-90"
        draggable={false}
      />
    );
  }

  if (variant === "runs") {
    return (
      <svg viewBox="0 0 120 96" className="mx-auto size-[88px]" fill="none" aria-hidden>
        <rect x="20" y="14" width="80" height="68" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
        <circle cx="36" cy="32" r="5" className="fill-signal" />
        <circle cx="36" cy="48" r="5" className="fill-brand" />
        <circle cx="36" cy="64" r="5" className="fill-muted-foreground/40" />
        <path d="M36 37v6M36 53v6" className="stroke-border" strokeWidth="2" />
        <path d="M48 32h40M48 48h32M48 64h24" className="stroke-muted-foreground/35" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "approvals") {
    return (
      <img
        src="/brand/empty/approvals-empty.svg"
        alt=""
        width={112}
        height={112}
        className="mx-auto size-[112px] object-contain dark:opacity-100 opacity-90"
        draggable={false}
      />
    );
  }

  if (variant === "analytics") {
    return (
      <svg viewBox="0 0 120 96" className="mx-auto size-[88px]" fill="none" aria-hidden>
        <rect x="16" y="16" width="88" height="64" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
        <path d="M28 64V48M44 64V36M60 64V42M76 64V28M92 64V52" className="stroke-brand/70" strokeWidth="6" strokeLinecap="round" />
        <circle cx="76" cy="28" r="5" className="fill-signal" />
      </svg>
    );
  }

  if (variant === "inbox") {
    return (
      <svg viewBox="0 0 120 96" className="mx-auto size-[88px]" fill="none" aria-hidden>
        <rect x="22" y="20" width="76" height="56" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
        <path d="M22 36h76" className="stroke-border" strokeWidth="1.5" />
        <path d="M38 28h16M38 48h44M38 58h28" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
        <circle cx="92" cy="28" r="10" className="fill-brand" />
        <path d="M88 28h8" className="stroke-white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 96" className="mx-auto size-[88px]" fill="none" aria-hidden>
      <rect x="28" y="20" width="64" height="56" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
      <circle cx="60" cy="44" r="12" className="fill-brand/15 stroke-brand/40" strokeWidth="1.5" />
      <path d="M54 44h12M60 38v12" className="stroke-brand" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  variant = "generic",
  title,
  description,
  action,
  className,
  compact,
}: {
  variant?: EmptyVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <div className={cn("mb-4", compact && "mb-3 scale-90")}>
        <EmptyIllustration variant={variant} />
      </div>
      <h3
        className={cn(
          "font-display tracking-tight text-foreground",
          compact ? "text-sm font-medium" : "text-lg font-semibold",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mt-1.5 max-w-sm text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Small decorative mark for page / section headers. */
export function SectionMark({
  variant = "orbit",
  className,
}: {
  variant?: "orbit" | "stack" | "shield" | "bars" | "nodes";
  className?: string;
}) {
  if (variant === "stack") {
    return (
      <svg viewBox="0 0 40 40" className={cn("size-9", className)} fill="none" aria-hidden>
        <rect x="6" y="18" width="28" height="16" rx="4" className="fill-muted stroke-border" strokeWidth="1.25" />
        <rect x="9" y="11" width="22" height="14" rx="3.5" className="fill-card stroke-border" strokeWidth="1.25" />
        <rect x="12" y="5" width="16" height="12" rx="3" className="fill-brand/20 stroke-brand/50" strokeWidth="1.25" />
      </svg>
    );
  }
  if (variant === "shield") {
    return (
      <svg viewBox="0 0 40 40" className={cn("size-9", className)} fill="none" aria-hidden>
        <path
          d="M20 4L34 10V20C34 28 26 34 20 36C14 34 6 28 6 20V10L20 4Z"
          className="fill-signal/15 stroke-signal/55"
          strokeWidth="1.25"
        />
        <path d="M15 20L18.5 23.5L26 15" className="stroke-signal" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "bars") {
    return (
      <svg viewBox="0 0 40 40" className={cn("size-9", className)} fill="none" aria-hidden>
        <rect x="6" y="6" width="28" height="28" rx="8" className="fill-card stroke-border" strokeWidth="1.25" />
        <path d="M12 28V20M18 28V14M24 28V18M30 28V12" className="stroke-brand" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "nodes") {
    return (
      <svg viewBox="0 0 40 40" className={cn("size-9", className)} fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4" className="fill-brand" />
        <circle cx="28" cy="12" r="3.5" className="fill-signal" />
        <circle cx="12" cy="28" r="3.5" className="fill-muted-foreground" />
        <circle cx="28" cy="28" r="4" className="fill-brand/70" />
        <path d="M15 14L25 14M14 16L14 24M26 16L26 24M15 26L25 26" className="stroke-border" strokeWidth="1.25" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} fill="none" aria-hidden>
      <circle cx="20" cy="20" r="14" className="fill-brand/10 stroke-brand/35" strokeWidth="1.25" />
      <circle cx="20" cy="20" r="5" className="fill-brand" />
      <circle cx="20" cy="8" r="2" className="fill-signal" />
      <circle cx="31" cy="26" r="2" className="fill-muted-foreground" />
    </svg>
  );
}
