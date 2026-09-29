"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckSquare,
  Database,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Ticket,
  AlertTriangle,
} from "lucide-react";

const commands = [
  { label: "Overview", hint: "Workspace health", path: "/dashboard", icon: LayoutDashboard },
  { label: "Ask AI", hint: "Grounded chat", path: "/chat", icon: MessageSquare },
  { label: "Knowledge Base", hint: "Upload and search docs", path: "/knowledge", icon: Database },
  { label: "Approvals", hint: "Pending tool actions", path: "/approvals", icon: CheckSquare },
  { label: "Agent Runs", hint: "Execution traces", path: "/agent-runs", icon: Activity },
  { label: "Analytics", hint: "Usage and cost", path: "/analytics", icon: BarChart3 },
  { label: "Settings", hint: "Workspace and security", path: "/settings", icon: Settings },
  { label: "Tickets", hint: "Preview", path: "/tickets", icon: Ticket },
  { label: "Incidents", hint: "Preview", path: "/incidents", icon: AlertTriangle },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-foreground/5">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    router.push(item.path);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
