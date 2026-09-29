"use client";

import { cn } from "../ui/utils";

/**
 * Theme-aware auth brand artwork from the Figma login panel export.
 * Dark / light SVGs — large, centered, object-contain (AS welcome-image pattern).
 */
export function AuthPanelVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[440px]", className)}>
      {/* Light */}
      <img
        src="/brand/auth/auth-panel-light.svg"
        alt=""
        width={900}
        height={1000}
        className="block h-auto w-full object-contain dark:hidden"
        draggable={false}
      />
      {/* Dark */}
      <img
        src="/brand/auth/auth-panel-dark.svg"
        alt=""
        width={900}
        height={1000}
        className="hidden h-auto w-full object-contain dark:block"
        draggable={false}
      />
    </div>
  );
}
