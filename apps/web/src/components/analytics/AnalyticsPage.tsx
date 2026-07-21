"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, MessageSquare, CheckCircle, Clock, Activity,
  ChevronDown, BarChart3, AlertCircle, Loader2, RefreshCw, CheckSquare, Database,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  listChatConversations,
  listAgentRuns,
  getAgentRunsSummary,
  listKnowledgeSources,
} from "@/lib/api";
import type { AgentRunLite, AgentRunsSummaryResponse } from "@/types/agentic";
import type { KnowledgeSource } from "@/types/knowledge";
import { formatRelativeTime } from "@/lib/format";

const dateRanges = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

// The backend caps listAgentRuns at 100 rows per request, so every
// range-scoped stat here is computed from "up to the most recent 100 runs
// within the range" rather than a true aggregate. Noted inline wherever it
// could matter (e.g. the trend chart truncation notice).
const RUNS_FETCH_LIMIT = 100;

type CustomTooltipProps = {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-2 text-xs">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">
              {p.name}: <span className="font-mono font-medium text-slate-100">{p.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

type DayBucket = { day: string; conversations: number; grounded: number };

function bucketRunsByDay(runs: AgentRunLite[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const run of runs) {
    const d = new Date(run.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sortKey = d.toISOString().slice(0, 10);
    const existing = map.get(sortKey);
    if (existing) {
      existing.conversations += 1;
      if (run.grounded) existing.grounded += 1;
    } else {
      map.set(sortKey, { day: key, conversations: 1, grounded: run.grounded ? 1 : 0 });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

type GapRow = { question: string; attempts: number; lastAsked: string };

function buildKnowledgeGaps(runs: AgentRunLite[]): GapRow[] {
  const ungrounded = runs.filter((r) => !r.grounded);
  const map = new Map<string, GapRow>();
  for (const run of ungrounded) {
    const key = run.question.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.attempts += 1;
      if (run.createdAt > existing.lastAsked) existing.lastAsked = run.createdAt;
    } else {
      map.set(key, { question: run.question, attempts: 1, lastAsked: run.createdAt });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.attempts - a.attempts).slice(0, 8);
}

type AnalyticsData = {
  totalConversations: number;
  runsInRange: AgentRunLite[];
  summary: AgentRunsSummaryResponse["data"] | null;
  sources: KnowledgeSource[];
};

export function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError("");
    try {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [conversationsRes, runsRes, summaryRes, sourcesRes] = await Promise.all([
        listChatConversations(),
        listAgentRuns({ limit: RUNS_FETCH_LIMIT, from }),
        getAgentRunsSummary(),
        listKnowledgeSources(),
      ]);
      setData({
        totalConversations: conversationsRes.data.conversations.length,
        runsInRange: runsRes.data.runs,
        summary: summaryRes.data,
        sources: sourcesRes.data.sources,
      });
    } catch {
      setError("Couldn't load analytics. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(rangeDays);
  }, [rangeDays, load]);

  const rangeLabel = dateRanges.find((r) => r.days === rangeDays)?.label ?? "Last 7 days";

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-center px-6">
        <div>
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <div className="text-sm text-red-400 mb-3">{error || "Something went wrong."}</div>
          <button
            className="px-3 py-1.5 rounded-lg bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs"
            onClick={() => load(rangeDays)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totalConversations, runsInRange, summary, sources } = data;

  const groundedInRange = runsInRange.filter((r) => r.grounded).length;
  const groundedPct = runsInRange.length > 0
    ? Math.round((groundedInRange / runsInRange.length) * 100)
    : null;

  const durations = runsInRange.map((r) => r.durationMs).filter((d): d is number => d != null);
  const avgResponseMs = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  const totals = summary?.totals;
  const completionPct = totals && totals.totalRuns > 0
    ? Math.round((totals.completedRuns / totals.totalRuns) * 100)
    : null;

  const toolCalls = summary?.toolCalls;
  const toolDecisions = toolCalls ? toolCalls.executed + toolCalls.rejected : 0;
  const approvalPct = toolCalls && toolDecisions > 0
    ? Math.round((toolCalls.executed / toolDecisions) * 100)
    : null;

  const metrics = [
    {
      label: "Total conversations", value: String(totalConversations), sub: "all time",
      icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20",
    },
    {
      label: "Grounded answer rate",
      value: groundedPct != null ? `${groundedPct}%` : "—",
      sub: runsInRange.length > 0 ? `${groundedInRange} of ${runsInRange.length} runs` : "no runs in range",
      icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    {
      label: "Avg response time",
      value: avgResponseMs != null ? `${(avgResponseMs / 1000).toFixed(1)}s` : "—",
      sub: durations.length > 0 ? `over ${durations.length} runs` : "no data",
      icon: Clock, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20",
    },
    {
      label: "Agent runs", value: String(runsInRange.length), sub: rangeLabel.toLowerCase(),
      icon: Activity, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20",
    },
    {
      label: "Run completion rate",
      value: completionPct != null ? `${completionPct}%` : "—",
      sub: totals ? `${totals.completedRuns} of ${totals.totalRuns} runs, all time` : "no data",
      icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20",
    },
    {
      label: "Tool approval rate",
      value: approvalPct != null ? `${approvalPct}%` : "—",
      sub: toolCalls ? `${toolCalls.executed} executed, ${toolCalls.rejected} rejected` : "no data",
      icon: CheckSquare, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20",
    },
  ];

  const trendData = bucketRunsByDay(runsInRange);
  const groundingData = groundedPct != null
    ? [
        { name: "Grounded", value: groundedInRange, color: "#10B981" },
        { name: "Not grounded", value: runsInRange.length - groundedInRange, color: "#334155" },
      ]
    : [];

  const readyCount = sources.filter((s) => s.status === "COMPLETED").length;
  const processingCount = sources.filter((s) => s.status === "PROCESSING" || s.status === "PENDING").length;
  const failedCount = sources.filter((s) => s.status === "FAILED").length;

  const runStatusData = totals
    ? [
        { status: "Completed", count: totals.completedRuns },
        { status: "Running", count: totals.runningRuns },
        { status: "Guardrail", count: totals.guardrailRuns },
        { status: "Failed", count: totals.failedRuns },
      ]
    : [];

  const gaps = buildKnowledgeGaps(runsInRange);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI activity, knowledge performance, and support insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-300 hover:border-[#475569] transition-colors"
            onClick={() => load(rangeDays)}
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-300 hover:border-[#475569] transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              {rangeLabel}
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            {showDateMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden z-10 shadow-xl">
                {dateRanges.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => { setRangeDays(r.days); setShowDateMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${rangeDays === r.days ? "text-cyan-400 bg-cyan-400/10" : "text-slate-400 hover:text-slate-200 hover:bg-[#334155]"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 hover:border-[#334155] transition-colors">
            <div className={`w-7 h-7 rounded-lg border ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className="font-mono text-xl font-bold text-slate-50">{value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</div>
            <div className="text-[10px] text-slate-600 mt-1.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Conversations over time */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-sm font-semibold text-slate-200">Agent runs over time</div>
              <div className="text-xs text-slate-500">
                Grounded vs total{runsInRange.length >= RUNS_FETCH_LIMIT ? ` · showing most recent ${RUNS_FETCH_LIMIT}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Grounded</span>
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-600">No runs in this range yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="groundedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="conversations" name="Total" stroke="#22D3EE" strokeWidth={2} fill="url(#totalGrad)" />
                <Area type="monotone" dataKey="grounded" name="Grounded" stroke="#10B981" strokeWidth={2} fill="url(#groundedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Grounded vs Not */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Grounded answer rate</div>
          <div className="text-xs text-slate-500 mb-5">{rangeLabel}</div>
          {runsInRange.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-600">No runs in this range yet.</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={groundingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {groundingData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -mt-2">
                <div className="font-mono text-3xl font-bold text-emerald-400">{groundedPct}%</div>
                <div className="text-xs text-slate-500">grounded</div>
              </div>
              <div className="flex gap-4 mt-4 text-[11px]">
                {groundingData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-400">{d.name}: <span className="text-slate-300 font-mono">{d.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Knowledge source health */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Knowledge source health</div>
          <div className="text-xs text-slate-500 mb-5">{sources.length} total source{sources.length === 1 ? "" : "s"}</div>
          {sources.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">No knowledge sources yet.</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Ready for AI", count: readyCount, color: "#10B981" },
                { label: "Processing", count: processingCount, color: "#FBBF24" },
                { label: "Failed", count: failedCount, color: "#F87171" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="font-mono text-slate-300">{s.count}</span>
                  </div>
                  <div className="w-full bg-[#1E293B] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${sources.length > 0 ? (s.count / sources.length) * 100 : 0}%`, background: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Runs by status */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Agent runs by status</div>
          <div className="text-xs text-slate-500 mb-5">All time</div>
          {runStatusData.length === 0 || runStatusData.every((r) => r.count === 0) ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-600">No runs recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={runStatusData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="status" type="category" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Runs" fill="#22D3EE" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Knowledge gaps table */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div>
            <div className="text-sm font-semibold text-slate-200">Questions needing better knowledge</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Repeated questions where AI could not find a grounded answer, {rangeLabel.toLowerCase()}
            </div>
          </div>
          <a
            href="/knowledge"
            className="flex items-center gap-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-cyan-300 transition-colors"
          >
            <Database className="w-3.5 h-3.5" /> Add knowledge
          </a>
        </div>
        {gaps.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No repeated ungrounded questions in this range — nice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E293B]">
                  {["Question", "Attempts", "Last asked"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {gaps.map((g, i) => (
                  <tr key={i} className="hover:bg-[#0B1220] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-slate-300">{g.question}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{g.attempts}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatRelativeTime(g.lastAsked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}