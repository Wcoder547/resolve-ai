import { cn } from "../ui/utils";

const BRAND_ORANGE = "#FF6A2B";

/** Checkmark + citation node from the ResolveAI logo system (24×24). */
function MarkPaths({
  color = "#FFFFFF",
  strokeWidth = 2.5,
}: {
  color?: string;
  strokeWidth?: number;
}) {
  const x0 = 4.5;
  const y0 = 13.5;
  const xM = 8;
  const yM = 16.5;
  const x1 = 20.5;
  const y1 = 5;

  return (
    <>
      <line
        x1={x0}
        y1={y0}
        x2={xM}
        y2={yM}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={xM}
        y1={yM}
        x2={x1}
        y2={y1}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx={xM} cy={yM} r={strokeWidth} fill={color} />
    </>
  );
}

/** App-icon tile: rounded orange square with white mark. */
function IconTile({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  const style =
    size != null
      ? { width: size, height: size }
      : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={style}
      aria-hidden
    >
      <rect width="100" height="100" rx="22" fill={BRAND_ORANGE} />
      <svg x="21" y="18" width="58" height="58" viewBox="0 0 24 24">
        <MarkPaths color="#FFFFFF" strokeWidth={2.5} />
      </svg>
    </svg>
  );
}

export type ResolveLogoProps = {
  /** `mark` = icon tile only; `lockup` = tile + ResolveAI wordmark */
  variant?: "mark" | "lockup";
  className?: string;
  /** Pixel size for the mark tile (lockup scales wordmark from this). Prefer className sizing for mark. */
  size?: number;
  /** Wordmark color for lockup. Defaults to current text color via `currentColor`. */
  wordmarkClassName?: string;
};

/**
 * ResolveAI brand mark / lockup from the official logo system.
 * Orange tile uses #FF6A2B to match CodeRabbit design tokens.
 */
export function ResolveLogo({
  variant = "mark",
  className,
  size,
  wordmarkClassName,
}: ResolveLogoProps) {
  if (variant === "lockup") {
    const tileSize = size ?? 28;
    const gap = Math.round(tileSize * 0.36);
    return (
      <span
        className={cn("inline-flex items-center", className)}
        style={{ gap }}
      >
        <IconTile size={tileSize} />
        <span
          className={cn(
            "font-display font-bold tracking-tight text-foreground leading-none",
            wordmarkClassName,
          )}
          style={{ fontSize: tileSize * 0.9 }}
        >
          ResolveAI
        </span>
      </span>
    );
  }

  return (
    <IconTile
      className={cn(size == null && "size-7", className)}
      size={size}
    />
  );
}

/** Drop-in replacement for the old triangle ResolveMark placeholders. */
export function ResolveMark({ className = "size-7" }: { className?: string }) {
  return <ResolveLogo variant="mark" className={className} />;
}
