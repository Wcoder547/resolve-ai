"use client";

import { useState } from "react";
import {
  Activity, CheckCircle, XCircle, Clock, Zap, FileText,
  ChevronRight, X, ChevronDown, ChevronUp, Copy, Download,
  RefreshCw, AlertCircle, Ticket, Loader2, Filter, Search
} from "lucide-react";
import { Button } from "../ui/button";

type RunStatus = "Completed" | "Failed" | "Running" | "Timeout";

interface Run {
  id: string;
  trigger: string;
  status: RunStatus;
  provider: string;
  model: string;
  duration: string;
  chunks: number;
  toolCalls: number;
  created: string;
  tokens: number;
  relatedTo?: string;
}

const runs: Run[] = [
  { id: "run_7f3k2m9x", trigger: "Ticket TKT-2891 assigned", status: "Completed", provider: "OpenRouter", model: "GPT-4o", duration: "1.47s", chunks: 4, toolCalls: 1, created: "2m ago", tokens: 2341, relatedTo: "TKT-2891" },
  { id: "run_4p9n1r2q", trigger: "Incident INC-47 created", status: "Completed", provider: "OpenRouter", model: "GPT-4o", duration: "2.13s", chunks: 6, toolCalls: 2, created: "18m ago", tokens: 3892, relatedTo: "INC-47" },
  { id: "run_8m2j5x1w", trigger: "Manual chat query", status: "Completed", provider: "OpenRouter", model: "GPT-4o", duration: "1.02s", chunks: 3, toolCalls: 0, created: "35m ago", tokens: 1654 },
  { id: "run_3v7q9k4z", trigger: "Ticket TKT-2884 assigned", status: "Failed", provider: "Groq", model: "llama-3.1-70b", duration: "0.31s", chunks: 0, toolCalls: 0, created: "1h ago", tokens: 0, relatedTo: "TKT-2884" },
  { id: "run_6c1n8t5y", trigger: "Approval APR-290 review", status: "Completed", provider: "OpenRouter", model: "GPT-4o", duration: "1.78s", chunks: 5, toolCalls: 1, created: "1h ago", tokens: 2987, relatedTo: "APR-290" },
  { id: "run_2x4h7p3s", trigger: "Scheduled knowledge sync", status: "Timeout", provider: "OpenRouter", model: "GPT-4o", duration: "30.0s", chunks: 0, toolCalls: 0, created: "2h ago", tokens: 421 },
  { id: "run_9q8l3m7r", trigger: "Manual chat query", status: "Running", provider: "OpenRouter", model: "GPT-4o", duration: "—", chunks: 0, toolCalls: 0, created: "just now", tokens: 0 },
];

const statusBadge = (s: RunStatus) => ({
  Completed: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  Failed: "bg-red-400/10 text-red-400 border-red-400/20",
  Running: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  Timeout: "bg-orange-400/10 text-orange-400 border-orange-400/20",
}[s]);

const statusIcon = (s: RunStatus) => ({
  Completed: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  Failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  Running: <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />,
  Timeout: <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
}[s]);

interface TraceStep {
  label: string;
  status: "done" | "failed" | "running" | "pending";
  timestamp: string;
  duration: string;
  input?: string;
  output?: string;
  meta?: Record<string, string>;
}

const getTraceSteps = (run: Run): TraceStep[] => {
  if (run.status === "Failed") return [
    { label: "Retrieval", status: "failed", timestamp: run.created, duration: "210ms", input: "Query: API authentication failing after key rotation", output: "Error: Provider connection refused (Groq)", meta: { provider: run.provider, model: run.model } },
  ];

  if (run.status === "Running") return [
    { label: "Retrieval", status: "done", timestamp: "just now", duration: "195ms", input: "Query: Manual chat query", output: "4 chunks retrieved", meta: { topScore: "0.92" } },
    { label: "Context selection", status: "running", timestamp: "just now", duration: "—", input: "4 candidate chunks", output: "Processing..." },
  ];

  return [
    { label: "Retrieval", status: "done", timestamp: run.created, duration: "210ms", input: `Query: ${run.trigger}`, output: `${run.chunks} chunks retrieved · avg score 0.91`, meta: { topScore: "0.94", source: "Billing Runbook" } },
    { label: "Context selection", status: "done", timestamp: run.created, duration: "45ms", input: `${run.chunks} candidate chunks`, output: `${Math.min(run.chunks, 3)} chunks selected for context window`, meta: { tokenBudget: "2048" } },
    { label: "LLM call", status: "done", timestamp: run.created, duration: "890ms", input: "System prompt + context + user query", output: "Answer generated with sources", meta: { provider: run.provider, model: run.model, tokens: run.tokens.toString(), promptTokens: Math.round(run.tokens * 0.6).toString(), completionTokens: Math.round(run.tokens * 0.4).toString() } },
    ...(run.toolCalls > 0 ? [
      { label: "Tool call", status: "done" as const, timestamp: run.created, duration: "320ms", input: `create_github_issue({ title: "Webhook timeout", labels: ["bug"] })`, output: `Issue #1234 created successfully`, meta: { tool: "github_create_issue", result: "success" } },
    ] : []),
    ...(run.toolCalls > 1 ? [
      { label: "Approval checkpoint", status: "done" as const, timestamp: run.created, duration: "4.2s", input: "Action: send_escalation_email · Risk: Medium", output: "Approved by Jane D.", meta: { approvalId: "APR-290", approvedBy: "Jane D." } },
    ] : []),
    { label: "Final output", status: "done", timestamp: run.created, duration: "12ms", input: "Structured response object", output: "Answer delivered · grounded · sources cited", meta: { grounded: "true", sourcesUsed: run.chunks.toString() } },
  ];
};

function TraceStep({ step, index }: { step: TraceStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const stepColor = {
    done: "border-emerald-400 bg-emerald-400/10",
    failed: "border-red-400 bg-red-400/10",
    running: "border-cyan-400 bg-cyan-400/10",
    pending: "border-slate-600 bg-slate-800",
  }[step.status];

  const dotColor = {
    done: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    running: <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />,
    pending: <div className="w-2 h-2 rounded-full bg-slate-600" />,
  }[step.status];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 ${stepColor} flex items-center justify-center flex-shrink-0`}>
          {dotColor}
        </div>
        <div className="w-px flex-1 bg-[#1E293B] my-1 min-h-4" />
      </div>

      <div className="pb-4 flex-1 min-w-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left group"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold text-slate-200">{step.label}</span>
            <span className="font-mono text-[10px] text-slate-500">{step.duration}</span>
            <span className="font-mono text-[10px] text-slate-600">{step.timestamp}</span>
            <span className="ml-auto text-slate-500 group-hover:text-slate-300 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
          {!expanded && step.output && (
            <p className="text-xs text-slate-500 truncate">{step.output}</p>
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-3 space-y-2">
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Input</div>
                <p className="text-xs font-mono text-slate-400 leading-relaxed">{step.input}</p>
              </div>
              <div className="border-t border-[#1E293B] pt-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Output</div>
                <p className="text-xs font-mono text-slate-400 leading-relaxed">{step.output}</p>
              </div>
              {step.meta && Object.keys(step.meta).length > 0 && (
                <div className="border-t border-[#1E293B] pt-2">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Metadata</div>
                  <div className="space-y-1">
                    {Object.entries(step.meta).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-[11px]">
                        <span className="font-mono text-slate-600">{k}</span>
                        <span className="font-mono text-slate-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunDetail({ run, onClose }: { run: Run; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState(false);
  const steps = getTraceSteps(run);

  const handleCopy = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E293B]">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300 mt-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm text-slate-300">{run.id}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(run.status)}`}>
                {statusIcon(run.status)} {run.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>{run.trigger}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{run.created}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
            <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Run summary */}
      <div className="px-5 py-3 border-b border-[#1E293B] bg-[#0B1220]">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Duration", value: run.duration },
            { label: "Provider", value: run.provider },
            { label: "Model", value: run.model },
            { label: "Tokens", value: run.tokens > 0 ? run.tokens.toLocaleString() : "—" },
            { label: "Chunks", value: run.chunks.toString() },
            { label: "Tool calls", value: run.toolCalls.toString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] text-slate-500">{label}</div>
              <div className="font-mono text-xs text-slate-300 font-medium mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-5 py-2.5 border-b border-[#1E293B] flex items-center gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copiedId ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedId ? "Copied!" : "Copy run ID"}
        </button>
        {run.relatedTo && (
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <Ticket className="w-3.5 h-3.5" /> Open {run.relatedTo}
          </button>
        )}
      </div>

      {/* Trace */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Execution trace</div>
        <div>
          {steps.map((step, i) => (
            <TraceStep key={i} step={step} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentRunsPage() {
  const [selected, setSelected] = useState<Run | null>(null);
  const [search, setSearch] = useState("");

  const filtered = runs.filter(r =>
    search === "" ||
    r.id.includes(search) ||
    r.trigger.toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Run list */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-[#1E293B]`}>
        <div className="px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-50">Agent Runs</h1>
              <p className="text-xs text-slate-500 mt-0.5">{runs.filter(r => r.status === "Running").length} running · {runs.length} total</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search runs by ID or trigger..."
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#334155] transition-colors"
              />
            </div>
            <button className="px-2.5 py-2 border border-[#1E293B] rounded-lg text-slate-500 hover:text-slate-300 hover:border-[#334155]">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="px-5 py-2 border-b border-[#1E293B] hidden sm:grid grid-cols-[1fr_80px_80px_60px] gap-3">
          {["Run", "Status", "Duration", "Tokens"].map(h => (
            <div key={h} className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">{h}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
          {filtered.map(run => (
            <button
              key={run.id}
              onClick={() => setSelected(run)}
              className={`w-full text-left px-5 py-3.5 hover:bg-[#0F172A] transition-colors
                ${selected?.id === run.id ? "bg-cyan-400/5 border-r-2 border-r-cyan-400" : ""}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">{run.id}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(run.status)}`}>
                      {statusIcon(run.status)} {run.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 truncate mb-1">{run.trigger}</div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="font-mono">{run.provider} · {run.model}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{run.duration}</span>
                    {run.chunks > 0 && <><span>·</span><span>{run.chunks} chunks</span></>}
                    {run.toolCalls > 0 && <><span>·</span><span>{run.toolCalls} tools</span></>}
                    <span>·</span>
                    <span>{run.created}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Run detail */}
      {selected ? (
        <div className="flex-1 overflow-hidden">
          <RunDetail run={selected} onClose={() => setSelected(null)} />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-sm text-slate-500">Select a run to inspect its trace</div>
            <div className="text-xs text-slate-600 mt-1">Full execution logs for every AI action</div>
          </div>
        </div>
      )}
    </div>
  );
}
