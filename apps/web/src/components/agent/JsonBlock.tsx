type JsonBlockProps = {
  data: unknown;
};

export function JsonBlock({ data }: JsonBlockProps) {
  return (
    <pre className="max-h-105 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}