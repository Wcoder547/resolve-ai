"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, Clock, Copy,
  RefreshCw, AlertCircle, Loader2, Filter, Search, ChevronRight,
  ChevronDown, ChevronUp, X
} from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState, SectionMark } from "../ui/EmptyState";
import { listAgentRuns, getAgentRunDetail } from "@/lib/api";
import type { AgentRunLite, AgentRunDetail, AgentStep, AgentToolCall } from "@/types/agentic";
import { formatRelativeTime } from "@/lib/format";

type RunStatus = "Completed" | "Failed" | "Running" | "Guardrail warning";

function toDisplayStatus(status: string): RunStatus {
  if (status === "COMPLETED") return "Completed";
  if (status === "FAILED") return "Failed";
  if (status === "RUNNING") return "Running";
  return "Guardrail warning";
}

const statusBadge = (s: RunStatus) => ({
  Completed: "bg-signal-soft text-signal border-signal/20",
  Failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  Running: "bg-brand-soft text-brand border-brand/20",
  "Guardrail warning": "bg-orange-50 text-orange-700 border-orange-200",
}[s]);

const statusIcon = (s: RunStatus) => ({
  Completed: <CheckCircle className="w-3.5 h-3.5 text-signal" />,
  Failed: <XCircle className="w-3.5 h-3.5 text-red-700" />,
  Running: <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />,
  "Guardrail warning": <AlertCircle className="w-3.5 h-3.5 text-orange-700" />,
}[s]);

type TraceEntry =
  | { kind: "step"; data: AgentStep }
  | { kind: "tool"; data: AgentToolCall };

function traceStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("fail") || s.includes("error") || s === "rejected") {
    return { border: "border-red-400 bg-red-50", icon: <XCircle className="w-4 h-4 text-red-700" /> };
  }
  if (s.includes("run") || s.includes("pending")) {
    return { border: "border-brand bg-brand-soft", icon: <Loader2 className="w-4 h-4 text-brand animate-spin" /> };
  }
  return { border: "border-emerald-400 bg-signal-soft", icon: <CheckCircle className="w-4 h-4 text-signal" /> };
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  const [expanded, setExpanded] = useState(false);
  const label = entry.kind === "step" ? entry.data.agentName : `Tool: ${entry.data.toolName}`;
  const status = entry.data.status;
  const timestamp = entry.data.createdAt ? formatRelativeTime(entry.data.createdAt) : "—";
  const duration = entry.data.latencyMs != null ? `${entry.data.latencyMs}ms` : "—";
  const output = entry.data.output ? JSON.stringify(entry.data.output) : entry.data.error || "";
  const { border, icon } = traceStatusColor(status);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 ${border} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="w-px flex-1 bg-muted my-1 min-h-4" />
      </div>

      <div className="pb-4 flex-1 min-w-0">
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left group">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{duration}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{timestamp}</span>
            <span className="ml-auto text-muted-foreground group-hover:text-foreground/80 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
          {!expanded && output && <p className="text-xs text-muted-foreground truncate">{output}</p>}
        </button>

        {expanded && (
          <div className="mt-2 bg-card border border-border rounded-xl p-3 space-y-2">
            {entry.data.input && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Input</div>
                <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {JSON.stringify(entry.data.input, null, 2)}
                </pre>
              </div>
            )}
            {entry.data.output && (
              <div className="border-t border-border pt-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Output</div>
                <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {JSON.stringify(entry.data.output, null, 2)}
                </pre>
              </div>
            )}
            {entry.data.error && (
              <div className="border-t border-border pt-2">
                <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">Error</div>
                <p className="text-xs font-mono text-red-300 leading-relaxed">{entry.data.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RunDetail({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    getAgentRunDetail(runId)
      .then(res => setDetail(res.data.agentRun))
      .catch(() => setError("Couldn't load this run."))
      .finally(() => setLoading(false));
  }, [runId]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(runId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-brand animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-center p-8">
        <div>
          <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-2" />
          <div className="text-sm text-red-700">{error || "Run not found."}</div>
        </div>
      </div>
    );
  }

  const status = toDisplayStatus(detail.status);
  const trace: TraceEntry[] = [
    ...detail.steps.map((s): TraceEntry => ({ kind: "step", data: s })),
    ...detail.toolCalls.map((t): TraceEntry => ({ kind: "tool", data: t })),
  ].sort((a, b) => (a.data.createdAt ?? "").localeCompare(b.data.createdAt ?? ""));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground/80 mt-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm text-foreground/80">{detail.id.slice(0, 8)}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(status)}`}>
                {statusIcon(status)} {status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{detail.standaloneQuestion || detail.question}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(detail.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Run summary */}
      <div className="px-5 py-3 border-b border-border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Duration", value: detail.durationMs != null ? `${(detail.durationMs / 1000).toFixed(2)}s` : "—" },
            { label: "Provider", value: detail.provider || "—" },
            { label: "Model", value: detail.model || "—" },
            { label: "Confidence", value: detail.confidence || "—" },
            { label: "Steps", value: detail.steps.length.toString() },
            { label: "Tool calls", value: detail.toolCalls.length.toString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="font-mono text-xs text-foreground/80 font-medium mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-5 py-2.5 border-b border-border flex items-center gap-3">
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-signal" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy run ID"}
        </button>
        {detail.needsEscalation && (
          <span className="flex items-center gap-1.5 text-xs text-orange-700">
            <AlertCircle className="w-3.5 h-3.5" /> Needs escalation{detail.escalationReason ? `: ${detail.escalationReason}` : ""}
          </span>
        )}
      </div>

      {/* Trace */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Execution trace</div>
        {trace.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recorded steps for this run.</p>
        ) : (
          <div>
            {trace.map((entry, i) => (
              <TraceRow key={i} entry={entry} />
            ))}
          </div>
        )}
        {detail.answer && (
          <div className="mt-4 bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-2">Final answer</div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{detail.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRunLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAgentRuns({ limit: 50 });
      setRuns(res.data.runs);
    } catch {
      setError("Couldn't load agent runs. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = runs.filter(r =>
    search === "" ||
    r.id.includes(search) ||
    r.question.toLowerCase().includes(search.toLowerCase()) ||
    (r.model || "").toLowerCase().includes(search.toLowerCase())
  );

  const runningCount = runs.filter(r => r.status === "RUNNING").length;

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Run list */}
      <div className={`flex flex-col ${selectedId ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-border`}>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 hidden sm:block">
                <SectionMark variant="nodes" />
              </div>
              <div>
                <h1 className="font-display text-xl tracking-tight text-foreground">Agent Runs</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{runningCount} running · {runs.length} total</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search runs by ID or trigger..."
                className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors"
              />
            </div>
            <button className="px-2.5 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground/80 hover:border-border">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="py-16 text-center px-5">
              <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
              <div className="text-sm text-red-700 mb-3">{error}</div>
              <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              variant="runs"
              title={search ? "No matching runs" : "No agent runs yet"}
              description={
                search
                  ? "Try a different search."
                  : "Ask a question in Chat — every grounded run appears here with a full trace."
              }
            />
          ) : filtered.map(run => {
            const status = toDisplayStatus(run.status);
            const durationLabel = run.durationMs != null ? `${(run.durationMs / 1000).toFixed(2)}s` : "—";
            return (
              <button
                key={run.id}
                onClick={() => setSelectedId(run.id)}
                className={`w-full text-left px-5 py-3.5 hover:bg-card transition-colors
                  ${selectedId === run.id ? "bg-brand-soft border-r-2 border-r-brand" : ""}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{run.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(status)}`}>
                        {statusIcon(status)} {status}
                      </span>
                    </div>
                    <div className="text-sm text-foreground/80 truncate mb-1">{run.question}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span className="font-mono">{run.provider || "—"} · {run.model || "—"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{durationLabel}</span>
                      {run._count && <><span>·</span><span>{run._count.steps} steps</span></>}
                      {run._count && run._count.toolCalls > 0 && <><span>·</span><span>{run._count.toolCalls} tools</span></>}
                      <span>·</span>
                      <span>{formatRelativeTime(run.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Run detail */}
      {selectedId ? (
        <div className="flex-1 overflow-hidden">
          <RunDetail runId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <EmptyState
            variant="runs"
            title="Select a run"
            description="Full execution traces for every AI action — steps, tools, and citations."
          />
        </div>
      )}
    </div>
  );
}