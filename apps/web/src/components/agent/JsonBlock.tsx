type JsonBlockProps = {
  data: unknown;
};

export function JsonBlock({ data }: JsonBlockProps) {
  return (
    <pre className="max-h-105 overflow-auto rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}