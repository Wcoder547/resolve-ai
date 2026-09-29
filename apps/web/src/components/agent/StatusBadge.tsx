type StatusBadgeProps = {
  value: string;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value.toLowerCase();

  const styles =
    normalized.includes("failed") || normalized.includes("error")
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
      : normalized.includes("pending")
        ? "bg-yellow-50 text-yellow-800 border-yellow-200"
        : normalized.includes("warning") || normalized.includes("guardrail")
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : normalized.includes("completed") ||
              normalized.includes("executed") ||
              normalized.includes("success")
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {value}
    </span>
  );
}