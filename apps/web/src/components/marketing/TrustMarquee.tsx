"use client";

import type { ReactNode } from "react";
import { cn } from "../ui/utils";

const logos = [
  {
    name: "Helix",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="8" className="fill-foreground/80" />
        <path
          d="M8 14c0-4.5 3.5-8 8-8"
          className="stroke-background"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M20 14c0 4.5-3.5 8-8 8"
          className="stroke-background"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: "Northwind",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <path
          d="M14 3L24 25h-5.5L16.5 19h-5L9.5 25H4L14 3zm-3.5 12h7L14 8.5 10.5 15z"
          className="fill-foreground/80"
        />
      </svg>
    ),
  },
  {
    name: "Stackline",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect x="4" y="18" width="20" height="5" rx="1.5" className="fill-foreground/35" />
        <rect x="4" y="11.5" width="20" height="5" rx="1.5" className="fill-foreground/60" />
        <rect x="4" y="5" width="20" height="5" rx="1.5" className="fill-foreground/85" />
      </svg>
    ),
  },
  {
    name: "Orbit",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <circle cx="14" cy="14" r="10" className="fill-none stroke-foreground/80" strokeWidth="2" />
        <circle cx="14" cy="14" r="3.2" className="fill-foreground/80" />
        <circle cx="22" cy="8" r="2.2" className="fill-brand" />
      </svg>
    ),
  },
  {
    name: "Meridian",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect x="5" y="4" width="5" height="20" rx="1.5" className="fill-foreground/80" />
        <rect x="18" y="4" width="5" height="20" rx="1.5" className="fill-foreground/80" />
        <path d="M7.5 14h13" className="stroke-brand" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Pulseforge",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <path
          d="M3 14h4l3-8 4 16 3-8h5"
          className="fill-none stroke-foreground/80"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Apexlane",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <path
          d="M14 4L24 24H4L14 4zm0 7.5L10.2 19h7.6L14 11.5z"
          className="fill-foreground/80"
        />
      </svg>
    ),
  },
  {
    name: "Cobalt",
    mark: (
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <circle cx="14" cy="14" r="11" className="fill-foreground/80" />
        <path
          d="M9 14h10M14 9v10"
          className="stroke-background"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

function LogoItem({ name, mark }: { name: string; mark: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-6 sm:px-8">
      {mark}
      <span className="font-display text-lg font-semibold tracking-tight text-foreground/70 sm:text-xl">
        {name}
      </span>
    </div>
  );
}

/** Infinite marquee of invented premium wordmarks for social proof. */
export function TrustMarquee({ className }: { className?: string }) {
  const row = (
    <>
      {logos.map((logo) => (
        <LogoItem key={logo.name} name={logo.name} mark={logo.mark} />
      ))}
    </>
  );

  return (
    <section
      className={cn("relative overflow-hidden border-b border-border py-10", className)}
      aria-label="Built for teams like those at"
    >
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Built for teams like those at
      </p>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24"
        />
        <div className="flex w-max animate-[marquee_42s_linear_infinite] hover:[animation-play-state:paused]">
          <div className="flex items-center">{row}</div>
          <div className="flex items-center" aria-hidden>
            {logos.map((logo) => (
              <LogoItem key={`dup-${logo.name}`} name={logo.name} mark={logo.mark} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
