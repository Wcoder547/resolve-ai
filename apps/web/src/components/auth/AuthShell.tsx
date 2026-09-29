"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { ResolveLogo } from "../brand/ResolveLogo";
import { cn } from "../ui/utils";
import { AuthPanelVisual } from "./AuthVisuals";

export function AuthBackLink({
  href = "/",
  label = "Back to ResolveAI",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}

export function AuthShell({
  children,
  panel,
  maxWidth = "sm",
  className,
}: {
  children: ReactNode;
  /** Optional left visual / brand panel (desktop). */
  panel?: ReactNode;
  maxWidth?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("relative flex min-h-screen bg-background", className)}>
      {panel ? (
        <div
          className={cn(
            "relative hidden w-[440px] shrink-0 overflow-hidden border-r border-border lg:flex lg:flex-col xl:w-[520px]",
            "bg-[#F6F6F4] dark:bg-[#0A0A0A]",
          )}
        >
          <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
            <div className="mb-2">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <ResolveLogo variant="lockup" size={32} />
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              {panel}
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          {/* Single back link on the form side — no duplicate logo link */}
          <AuthBackLink />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div
            className={cn(
              "w-full",
              maxWidth === "md" ? "max-w-md" : "max-w-sm",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Left brand stage: large centered panel artwork + optional short tagline.
 * Matches Accomplished Singles pattern (logo lives in AuthShell).
 */
export function AuthBrandPanel({
  tagline = "Grounded answers you can trust.",
  visual,
}: {
  /** Short line under the image. Pass null to hide. */
  tagline?: string | null;
  visual?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex w-full flex-1 items-center justify-center">
        {visual ?? <AuthPanelVisual />}
      </div>
      {tagline ? (
        <p className="max-w-[280px] text-center text-sm tracking-wide text-muted-foreground">
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
