"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Zap,
  ChevronRight, X, Loader2, AlertCircle, User, Activity, Ticket
} from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState, SectionMark } from "../ui/EmptyState";
import { listPendingToolCalls, approveToolCall, rejectToolCall } from "@/lib/api";
import type { PendingToolCall } from "@/types/agentic";
import { formatRelativeTime } from "@/lib/format";

// Records from the API always have an id; narrow it here once so the rest
// of the component doesn't have to deal with the optional `id?: string`
// on the shared AgentToolCall type.
type LoadedToolCall = PendingToolCall & { id: string };

type RiskLevel = "High" | "Medium" | "Low";
type ViewStatus = "Pending" | "Approved" | "Rejected";

// The backend doesn't store an explicit risk level for tool calls, so we
// derive a rough one client-side from the tool's name/category. This is a
// heuristic for the UI only, not a value the API returns.
function inferRisk(toolCall: PendingToolCall): RiskLevel {
  const signal = `${toolCall.toolName} ${toolCall.toolCategory ?? ""}`.toLowerCase();
  if (/delete|bulk|activate|charge|refund|payment|billing/.test(signal)) return "High";
  if (/email|notify|escalate|page|create_issue|github/.test(signal)) return "Medium";
  return "Low";
}

const riskBadge = (risk: RiskLevel) => ({
  High: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  Medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  Low: "bg-muted text-muted-foreground border-border",
}[risk]);

const statusBadge = (s: ViewStatus) => ({
  Pending: "bg-sky-50 text-sky-700 border-sky-200",
  Approved: "bg-signal-soft text-signal border-signal/20",
  Rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
}[s]);

function ConfirmModal({
  toolCall,
  action,
  risk,
  submitting,
  onConfirm,
  onCancel,
}: {
  toolCall: LoadedToolCall;
  action: "approve" | "reject";
  risk: RiskLevel;
  submitting: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          {action === "approve" ? (
            <div className="w-10 h-10 rounded-xl bg-signal-soft border border-signal/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-signal" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-700" />
            </div>
          )}
          <div>
            <div className="text-base font-semibold text-foreground">
              {action === "approve" ? "Confirm approval" : "Reject action"}
            </div>
            <div className="text-xs text-muted-foreground">{toolCall.id.slice(0, 8)} · {risk} risk</div>
          </div>
        </div>

        {risk === "High" && action === "approve" && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">This is a high-risk action. Review the payload carefully before approving. This action cannot be undone once executed.</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Action</div>
          <div className="text-sm text-foreground/80 font-mono">{toolCall.toolName}</div>
        </div>

        {action === "reject" && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Reason for rejection</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this action should not proceed..."
              rows={3}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground resize-none focus:outline-none focus:border-red-400/50 transition-colors"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => onConfirm(reason || undefined)}
            disabled={submitting}
            className={`flex-1 font-semibold text-sm disabled:opacity-50 ${action === "approve" ? "bg-signal text-white hover:bg-signal/90" : "bg-red-500 hover:bg-red-400 text-foreground"}`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : action === "approve" ? "Approve action" : "Reject action"}
          </Button>
          <Button
            onClick={onCancel}
            disabled={submitting}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalDetail({
  toolCall,
  status,
  createdTicketId,
  onClose,
  onApprove,
  onReject,
}: {
  toolCall: LoadedToolCall;
  status: ViewStatus;
  createdTicketId?: string | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}) {
  const [modal, setModal] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const risk = inferRisk(toolCall);

  const handleConfirm = async (reason?: string) => {
    setSubmitting(true);
    try {
      if (modal === "approve") await onApprove(toolCall.id);
      else await onReject(toolCall.id, reason);
      setModal(null);
    } catch {
      // Error surfaces via the list-level error state; keep modal open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {modal && (
        <ConfirmModal
          toolCall={toolCall}
          action={modal}
          risk={risk}
          submitting={submitting}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground/80 mt-1 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">{toolCall.id.slice(0, 8)}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${riskBadge(risk)}`}>
                  <AlertCircle className="w-2.5 h-2.5" /> {risk} risk
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(status)}`}>
                  {status}
                </span>
              </div>
              <h2 className="text-base font-semibold text-foreground leading-tight font-mono">{toolCall.toolName}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />ResolveAI Agent</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  run {toolCall.agentRun.id.slice(0, 8)}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(toolCall.createdAt ?? new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {risk === "High" && status === "Pending" && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">This is a <strong>high-risk action</strong>. Review all details carefully before approving. Execution cannot be undone.</p>
            </div>
          )}

          {/* Originating question */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-2">Triggered by</div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {toolCall.agentRun.standaloneQuestion || toolCall.agentRun.question}
            </p>
          </div>

          {/* AI Reasoning */}
          {toolCall.reason && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-brand" />
                <div className="text-[10px] font-semibold text-brand uppercase tracking-wider">AI Reasoning</div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{toolCall.reason}</p>
            </div>
          )}

          {/* Payload */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-2">Payload preview</div>
            <pre className="text-xs font-mono text-foreground/80 bg-card border border-border rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(toolCall.input ?? {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Action footer */}
        {status === "Pending" && (
          <div className="px-5 py-4 border-t border-border flex gap-3">
            <Button
              onClick={() => setModal("approve")}
              className="flex-1 bg-signal text-white hover:bg-signal/90 font-semibold text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
            <Button
              onClick={() => setModal("reject")}
              variant="outline"
              className="flex-1 border-red-400/30 text-red-700 hover:bg-red-50 bg-transparent font-semibold text-sm"
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
          </div>
        )}

        {status !== "Pending" && (
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className={`flex items-center gap-2 text-sm font-medium ${status === "Approved" ? "text-signal" : "text-red-700"}`}>
              {status === "Approved" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              Action {status.toLowerCase()}
            </div>
            {status === "Approved" && createdTicketId ? (
              <Link
                href="/tickets"
                className="inline-flex items-center gap-2 rounded-xl border border-signal/25 bg-signal-soft px-3 py-2 text-xs font-medium text-signal hover:bg-signal/10"
              >
                <Ticket className="h-3.5 w-3.5" />
                Ticket created — open Tickets
                <span className="font-mono opacity-70">{createdTicketId.slice(0, 8)}</span>
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

const filterTabs = ["All", "Pending", "High risk", "Approved", "Rejected"] as const;

export function ApprovalsPage() {
  const [toolCalls, setToolCalls] = useState<LoadedToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filterTabs)[number]>("All");

  // Items acted on this session. The API only exposes PENDING tool calls,
  // so "Approved"/"Rejected" reflect actions taken in this session rather
  // than a persisted history — that history isn't available from the backend yet.
  const [actioned, setActioned] = useState<Record<string, "Approved" | "Rejected">>({});
  const [createdTickets, setCreatedTickets] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPendingToolCalls();
      setToolCalls(
        res.data.toolCalls.filter((t): t is LoadedToolCall => typeof t.id === "string")
      );
    } catch {
      setError("Couldn't load pending approvals. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getStatus = (id: string): ViewStatus => actioned[id] ?? "Pending";

  const handleApprove = async (id: string) => {
    const res = await approveToolCall(id);
    setActioned(prev => ({ ...prev, [id]: "Approved" }));

    const execution = res.data.execution as {
      output?: { ticketId?: string };
    };
    const ticketId = execution.output?.ticketId;
    if (typeof ticketId === "string" && ticketId.length > 0) {
      setCreatedTickets(prev => ({ ...prev, [id]: ticketId }));
    }

    // Notify the sidebar so its badge count refreshes immediately instead
    // of waiting for its next poll.
    window.dispatchEvent(new Event("approvals:changed"));
  };

  const handleReject = async (id: string, reason?: string) => {
    await rejectToolCall(id, reason);
    setActioned(prev => ({ ...prev, [id]: "Rejected" }));
    window.dispatchEvent(new Event("approvals:changed"));
  };

  // Pending count should only reflect items still awaiting a decision, not
  // ones this session already approved/rejected (those stay in `toolCalls`
  // now so the Approved/Rejected tabs have something to show).
  const pendingCount = toolCalls.filter(t => getStatus(t.id) === "Pending").length;

  const filtered = toolCalls.filter(t => {
    const risk = inferRisk(t);
    const status = getStatus(t.id);
    if (filter === "All") return true;
    if (filter === "Pending") return status === "Pending";
    if (filter === "High risk") return risk === "High" && status === "Pending";
    if (filter === "Approved") return status === "Approved";
    if (filter === "Rejected") return status === "Rejected";
    return true;
  });

  const selected = selectedId ? toolCalls.find(t => t.id === selectedId) : null;

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* List panel */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex lg:w-105 xl:w-120" : "flex-1"} border-r border-border`}>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 hidden sm:block">
                <SectionMark variant="shield" />
              </div>
              <div>
                <h1 className="font-display text-xl tracking-tight text-foreground">Approvals</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{pendingCount} pending · human review required</p>
              </div>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {filterTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === tab ? "bg-brand-soft text-brand border border-brand/20" : "text-muted-foreground hover:text-foreground/80 border border-transparent"}`}
              >
                {tab}
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] bg-amber-50 text-amber-700 px-1 rounded">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
              <div className="text-sm text-red-700 mb-3">{error}</div>
              <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              variant="approvals"
              title={filter === "Pending" || filter === "All" ? "Nothing to review" : "No approvals in this view"}
              description={
                filter === "Pending" || filter === "All"
                  ? "Risky tool calls pause here until you approve or reject."
                  : "Switch filters to see other decisions."
              }
            />
          ) : filtered.map(t => {
            const risk = inferRisk(t);
            const status = getStatus(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-4 bg-card border rounded-xl transition-all hover:border-border
                  ${selectedId === t.id ? "border-brand/30 bg-brand/5" : "border-border"}
                  ${status === "Pending" && risk === "High" ? "border-l-2 border-l-red-400" : ""}
                `}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    <span className="font-mono text-[10px] text-muted-foreground">{t.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${riskBadge(risk)}`}>{risk}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusBadge(status)}`}>{status}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="text-sm font-medium text-foreground leading-tight mb-2 font-mono">{t.toolName}</div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span>ResolveAI Agent</span>
                  <span>·</span>
                  <span className="font-mono">run {t.agentRun.id.slice(0, 8)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(t.createdAt ?? new Date().toISOString())}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 overflow-hidden">
          <ApprovalDetail
            toolCall={selected}
            status={getStatus(selected.id)}
            createdTicketId={createdTickets[selected.id] ?? null}
            onClose={() => setSelectedId(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <EmptyState
            variant="approvals"
            title="Select an approval"
            description="High-risk actions require your explicit approval before tools run."
          />
        </div>
      )}
    </div>
  );
}