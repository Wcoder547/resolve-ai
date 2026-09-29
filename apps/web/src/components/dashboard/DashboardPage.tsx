"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database, MessageSquare, CheckSquare,
  TrendingUp, Upload, ArrowUpRight, Zap, Clock, FileText,
  Activity, ChevronRight, AlertCircle, Loader2, RefreshCw
} from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState, SectionMark } from "../ui/EmptyState";
import {
  listKnowledgeSources,
  listChatConversations,
  listAgentRuns,
  getAgentRunsSummary,
  listPendingToolCalls,
} from "@/lib/api";
import type { KnowledgeSource, KnowledgeSourceStatus } from "@/types/knowledge";
import type { AgentRunLite, AgentRunsSummaryResponse, PendingToolCall } from "@/types/agentic";
import { formatRelativeTime } from "@/lib/format";


type KnowledgeDisplayStatus = "Ready" | "Processing" | "Failed" | "Pending";

const KNOWLEDGE_STATUS_MAP: Record<KnowledgeSourceStatus, KnowledgeDisplayStatus> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

function fileExtLabel(source: KnowledgeSource): string {
  if (source.type === "URL") return "URL";
  if (source.type === "GITHUB") return "GITHUB";
  if (source.mimeType?.includes("pdf")) return "PDF";
  if (source.mimeType?.includes("markdown")) return "MD";
  if (source.mimeType?.includes("word") || source.mimeType?.includes("officedocument")) return "DOCX";
  if (source.type === "TEXT") return "TXT";
  return source.type;
}

const knowledgeStatusBadge = (status: KnowledgeDisplayStatus) => {
  const map: Record<KnowledgeDisplayStatus, string> = {
    Ready: "bg-signal-soft text-signal border-signal/20",
    Processing: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    Failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    Pending: "bg-muted text-muted-foreground border-border",
  };
  return map[status];
};

type RiskLevel = "High" | "Medium" | "Low";


function inferRisk(toolCall: PendingToolCall): RiskLevel {
  const signal = `${toolCall.toolName} ${toolCall.toolCategory ?? ""}`.toLowerCase();
  if (/delete|bulk|activate|charge|refund|payment|billing/.test(signal)) return "High";
  if (/email|notify|escalate|page|create_issue|github/.test(signal)) return "Medium";
  return "Low";
}

const riskBadge = (risk: RiskLevel) => ({
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-muted text-muted-foreground",
}[risk]);

type DashboardData = {
  sources: KnowledgeSource[];
  conversationsCount: number;
  recentRuns: AgentRunLite[];
  summary: AgentRunsSummaryResponse["data"] | null;
  pendingToolCalls: PendingToolCall[];
};

export function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sourcesRes, conversationsRes, runsRes, summaryRes, pendingRes] =
        await Promise.all([
          listKnowledgeSources(),
          listChatConversations(),
          listAgentRuns({ limit: 5 }),
          getAgentRunsSummary(),
          listPendingToolCalls(),
        ]);

      setData({
        sources: sourcesRes.data.sources,
        conversationsCount: conversationsRes.data.conversations.length,
        recentRuns: runsRes.data.runs,
        summary: summaryRes.data,
        pendingToolCalls: pendingRes.data.toolCalls,
      });
    } catch {
      setError("Couldn't load your dashboard. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-center px-6">
        <div>
          <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
          <div className="text-sm text-red-700 mb-3">{error || "Something went wrong."}</div>
          <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { sources, conversationsCount, recentRuns, summary, pendingToolCalls } = data;

  const readyCount = sources.filter(s => s.status === "COMPLETED").length;
  const processingCount = sources.filter(s => s.status === "PROCESSING" || s.status === "PENDING").length;
  const failedCount = sources.filter(s => s.status === "FAILED").length;
  const totalSources = sources.length || 1;

  const groundedPct = summary && summary.last24Hours.totalRuns > 0
    ? Math.round((summary.last24Hours.groundedRuns / summary.last24Hours.totalRuns) * 100)
    : null;

  const metrics = [
    {
      label: "Knowledge sources",
      value: String(sources.length),
      trend: `${readyCount} ready for AI`,
      icon: Database, color: "text-brand", bg: "bg-brand-soft border-brand/20",
    },
    {
      label: "Conversations",
      value: String(conversationsCount),
      trend: "total to date",
      icon: MessageSquare, color: "text-sky-700", bg: "bg-sky-50 border-sky-200",
    },
    {
      label: "Agent runs (24h)",
      value: String(summary?.last24Hours.totalRuns ?? 0),
      trend: `${summary?.totals.totalRuns ?? 0} all time`,
      icon: Zap, color: "text-stone-700", bg: "bg-stone-100 border-stone-200",
    },
    {
      label: "Grounded answers (24h)",
      value: groundedPct != null ? `${groundedPct}%` : "—",
      trend: groundedPct != null ? `${summary?.last24Hours.groundedRuns} of ${summary?.last24Hours.totalRuns} runs` : "no runs yet",
      icon: TrendingUp, color: "text-signal", bg: "bg-signal-soft border-signal/20",
    },
  ];

  const knowledgeHealth = [
    { label: "Ready for AI", count: readyCount, color: "bg-emerald-400", textColor: "text-signal" },
    { label: "Processing", count: processingCount, color: "bg-yellow-400", textColor: "text-amber-700" },
    { label: "Failed", count: failedCount, color: "bg-red-400", textColor: "text-red-700" },
  ];

  const recentSources = [...sources]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const topApprovals = pendingToolCalls.slice(0, 3);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 hidden sm:block">
            <SectionMark variant="orbit" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-signal mb-1.5">Workspace</p>
            <h1 className="font-display text-3xl tracking-tight text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Monitor knowledge, AI activity, and pending approvals.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs"
            onClick={load}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, trend, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 hover:border-border transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg border ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono mb-0.5">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-[10px] text-muted-foreground mt-1.5">{trend}</div>
          </div>
        ))}
      </div>

      {/* Pending approvals banner — only shown when there's something to act on */}
      {pendingToolCalls.length > 0 && (
        <div className="bg-yellow-400/5 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <CheckSquare className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-medium text-amber-700">
              {pendingToolCalls.length} action{pendingToolCalls.length === 1 ? "" : "s"} awaiting approval
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-400/30 text-amber-700 hover:bg-amber-50 bg-transparent text-xs sm:ml-auto"
            onClick={() => router.push("/approvals")}
          >
            Review <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Knowledge health */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-foreground">Knowledge health</div>
            <button
              className="text-xs text-brand hover:text-brand transition-colors"
              onClick={() => router.push("/knowledge")}
            >
              View all
            </button>
          </div>
          {sources.length === 0 ? (
            <EmptyState
              compact
              variant="knowledge"
              title="No sources yet"
              description="Upload a runbook or FAQ to ground answers."
              action={
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs" onClick={() => router.push("/knowledge")}>
                  Upload source
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {knowledgeHealth.map(({ label, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-mono font-medium ${textColor}`}>{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`${color} h-1.5 rounded-full`}
                      style={{ width: `${(count / totalSources) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            {sources.length} total source{sources.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Quick actions</div>
          <div className="space-y-2">
            {[
              { label: "Upload knowledge source", icon: Upload, action: "/knowledge" },
              { label: "Start AI conversation", icon: MessageSquare, action: "/chat" },
              {
                label: "Review approvals", icon: CheckSquare, action: "/approvals",
                badge: pendingToolCalls.length > 0 ? String(pendingToolCalls.length) : undefined,
              },
              { label: "Check agent runs", icon: Activity, action: "/agent-runs" },
            ].map(({ label, icon: Icon, action, badge }) => (
              <button
                key={label}
                onClick={() => router.push(action)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted transition-all text-left"
              >
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground/80 flex-1">{label}</span>
                {badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {badge}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Pending approvals summary */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-foreground">Pending approvals</div>
            <button
              className="text-xs text-brand hover:text-brand transition-colors"
              onClick={() => router.push("/approvals")}
            >
              View all ({pendingToolCalls.length})
            </button>
          </div>
          {topApprovals.length === 0 ? (
            <EmptyState
              compact
              variant="approvals"
              title="All clear"
              description="Risky tools will pause here for review."
            />
          ) : (
            <div className="space-y-3">
              {topApprovals.map((toolCall) => {
                const risk = inferRisk(toolCall);
                return (
                  <div
                    key={toolCall.id ?? toolCall.toolCallId}
                    className="p-3 bg-card border border-border rounded-lg hover:border-border transition-colors cursor-pointer"
                    onClick={() => router.push("/approvals")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs text-foreground/80 leading-relaxed">{toolCall.toolName}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${riskBadge(risk)}`}>
                        {risk}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {toolCall.agentRun.question.slice(0, 40)}{toolCall.agentRun.question.length > 40 ? "…" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent AI activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Recent AI activity</div>
          <button
            className="text-xs text-brand hover:text-brand transition-colors"
            onClick={() => router.push("/agent-runs")}
          >
            View all
          </button>
        </div>
        {recentRuns.length === 0 ? (
          <EmptyState
            compact
            variant="runs"
            title="No agent runs yet"
            description="Ask a question in Chat to see grounded runs here."
            action={
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs" onClick={() => router.push("/chat")}>
                Ask AI
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-card transition-colors cursor-pointer"
                onClick={() => router.push("/agent-runs")}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${run.grounded ? "bg-emerald-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground/80 truncate">{run.question}</div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${run.grounded ? "bg-signal-soft text-signal" : "bg-red-50 text-red-700"}`}>
                  {run.grounded ? "Grounded" : "Not grounded"}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0 hidden sm:block">{run.model || "—"}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 hidden md:block">
                  {run._count ? `${run._count.toolCalls} tools` : ""}
                </span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatRelativeTime(run.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sources table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Recent knowledge sources</div>
          <button
            className="text-xs text-brand hover:text-brand transition-colors"
            onClick={() => router.push("/knowledge")}
          >
            View all
          </button>
        </div>
        {recentSources.length === 0 ? (
          <EmptyState
            compact
            variant="knowledge"
            title="No knowledge sources yet"
            description="Add docs so the agent can cite real sources."
            action={
              <Button size="sm" variant="outline" className="text-xs border-border" onClick={() => router.push("/knowledge")}>
                Go to Knowledge
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Source", "Type", "Status", "Docs", "Updated"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSources.map((src) => {
                  const status = KNOWLEDGE_STATUS_MAP[src.status];
                  return (
                    <tr
                      key={src.id}
                      className="hover:bg-card transition-colors cursor-pointer"
                      onClick={() => router.push("/knowledge")}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground/80 font-medium">{src.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{fileExtLabel(src)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${knowledgeStatusBadge(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{src.documentsCount ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{formatRelativeTime(src.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}