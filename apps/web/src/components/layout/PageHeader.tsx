"use client";

import type { ReactNode } from "react";
import { cn } from "../ui/utils";
import { SectionMark } from "../ui/EmptyState";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  mark,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  mark?: "orbit" | "stack" | "shield" | "bars" | "nodes";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-start gap-3">
          {mark ? (
            <div className="mt-0.5 hidden sm:block">
              <SectionMark variant={mark} />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1.5">
            {eyebrow ? (
              <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-signal">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-[0_1px_0_rgba(12,12,12,0.04)]", className)}>
      {children}
    </div>
  );
}
