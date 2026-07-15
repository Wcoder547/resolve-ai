"use client";

import { useRouter } from "next/navigation";
import {
  Database, MessageSquare, Ticket, AlertTriangle, CheckSquare,
  TrendingUp, Upload, ArrowUpRight, Zap, Clock, FileText,
  Activity, ChevronRight, MoreHorizontal, RefreshCw
} from "lucide-react";
import { Button } from "../ui/button";

const metrics = [
  { label: "Knowledge sources", value: "24", trend: "+3 this week", icon: Database, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
  { label: "Completed chunks", value: "8,460", trend: "+420 today", icon: Zap, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
  { label: "Conversations", value: "312", trend: "+28 today", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  { label: "Grounded answers", value: "94%", trend: "+2% vs last week", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
];

const knowledgeHealth = [
  { label: "Ready for AI", count: 20, color: "bg-emerald-400", textColor: "text-emerald-400" },
  { label: "Processing", count: 3, color: "bg-yellow-400", textColor: "text-yellow-400" },
  { label: "Failed", count: 1, color: "bg-red-400", textColor: "text-red-400" },
];

const recentActivity = [
  { q: "Why is the subscription inactive after payment?", grounded: true, model: "GPT-4o", sources: 2, time: "2m ago" },
  { q: "How do I reset an organization API key?", grounded: true, model: "GPT-4o", sources: 3, time: "8m ago" },
  { q: "What steps for webhook delivery delays?", grounded: true, model: "GPT-4o", sources: 2, time: "15m ago" },
  { q: "Custom SLA configuration details", grounded: false, model: "GPT-4o", sources: 0, time: "22m ago" },
  { q: "When should a ticket be escalated?", grounded: true, model: "GPT-4o", sources: 4, time: "34m ago" },
];

const recentSources = [
  { name: "Billing Runbook", type: "PDF", status: "Ready", docs: 1, chunks: 234, updated: "2h ago" },
  { name: "Support FAQ v3", type: "DOCX", status: "Ready", docs: 1, chunks: 892, updated: "5h ago" },
  { name: "API Reference", type: "MD", status: "Processing", docs: 1, chunks: 0, updated: "12m ago" },
  { name: "Incident Playbooks", type: "PDF", status: "Ready", docs: 4, chunks: 156, updated: "1d ago" },
  { name: "Onboarding Guide", type: "PDF", status: "Failed", docs: 1, chunks: 0, updated: "3d ago" },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Ready: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    Processing: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    Failed: "bg-red-400/10 text-red-400 border-red-400/20",
    Pending: "bg-slate-400/10 text-slate-400 border-slate-400/20",
  };
  return map[status] || map.Pending;
};

export function DashboardPage() {
  const router = useRouter();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor your knowledge, AI activity, and support operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs"
            onClick={() => router.push("/app/knowledge")}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload source
          </Button>
          <Button
            size="sm"
            className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs"
            onClick={() => router.push("/app/chat")}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Ask AI
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, trend, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 hover:border-[#334155] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg border ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-50 font-mono mb-0.5">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-[10px] text-emerald-400 mt-1.5">{trend}</div>
          </div>
        ))}
      </div>

      {/* Active operations banner */}
      <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">SEV2 Active</span>
          <span className="text-sm text-slate-400">Payment webhooks delayed — 1 active incident</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs sm:ml-auto"
          onClick={() => router.push("/app/incidents")}
        >
          View incident <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Knowledge health */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-200">Knowledge health</div>
            <button
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              onClick={() => router.push("/app/knowledge")}
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {knowledgeHealth.map(({ label, count, color, textColor }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-mono font-medium ${textColor}`}>{count}</span>
                </div>
                <div className="w-full bg-[#1E293B] rounded-full h-1.5">
                  <div
                    className={`${color} h-1.5 rounded-full`}
                    style={{ width: `${(count / 24) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1E293B] text-xs text-slate-500">
            24 total sources · Last sync 2 min ago
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-4">Quick actions</div>
          <div className="space-y-2">
            {[
              { label: "Upload knowledge source", icon: Upload, action: "/app/knowledge" },
              { label: "Start AI conversation", icon: MessageSquare, action: "/app/chat" },
              { label: "Review approvals", icon: CheckSquare, action: "/app/approvals", badge: "3" },
              { label: "View active incident", icon: AlertTriangle, action: "/app/incidents", badge: "SEV2", badgeColor: "text-red-400 bg-red-400/10" },
              { label: "Check agent runs", icon: Activity, action: "/app/agent-runs" },
            ].map(({ label, icon: Icon, action, badge, badgeColor }) => (
              <button
                key={label}
                onClick={() => router.push(action)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-[#334155] hover:bg-[#1E293B] transition-all text-left"
              >
                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-300 flex-1">{label}</span>
                {badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor || "bg-yellow-400/10 text-yellow-400"}`}>
                    {badge}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Pending approvals summary */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-200">Pending approvals</div>
            <button
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              onClick={() => router.push("/app/approvals")}
            >
              View all (3)
            </button>
          </div>
          <div className="space-y-3">
            {[
              { action: "Create GitHub issue for webhook timeouts", risk: "High", ticket: "#TKT-2891" },
              { action: "Send escalation email to billing team", risk: "Medium", ticket: "#TKT-2888" },
              { action: "Tag incident as SEV1 in PagerDuty", risk: "Medium", ticket: "INC-45" },
            ].map(({ action, risk, ticket }) => (
              <div key={ticket} className="p-3 bg-[#0B1220] border border-[#1E293B] rounded-lg hover:border-[#334155] transition-colors cursor-pointer"
                onClick={() => router.push("/app/approvals")}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs text-slate-300 leading-relaxed">{action}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${risk === "High" ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                    {risk}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">{ticket}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent AI activity */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="text-sm font-semibold text-slate-200">Recent AI activity</div>
          <button
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            onClick={() => router.push("/app/chat")}
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-[#1E293B]">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#0B1220] transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.grounded ? "bg-emerald-400" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300 truncate">{item.q}</div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${item.grounded ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                {item.grounded ? "Grounded" : "Not grounded"}
              </span>
              <span className="text-[11px] font-mono text-slate-600 flex-shrink-0 hidden sm:block">{item.model}</span>
              <span className="text-[11px] text-slate-600 flex-shrink-0 hidden md:block">{item.sources} src</span>
              <span className="text-[11px] text-slate-600 flex-shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sources table */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="text-sm font-semibold text-slate-200">Recent knowledge sources</div>
          <button
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            onClick={() => router.push("/app/knowledge")}
          >
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E293B]">
                {["Source", "Type", "Status", "Docs", "Chunks", "Updated", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {recentSources.map((src) => (
                <tr key={src.name} className="hover:bg-[#0B1220] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-300 font-medium">{src.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-slate-500">{src.type}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(src.status)}`}>
                      {src.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{src.docs}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{src.chunks > 0 ? src.chunks.toLocaleString() : "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{src.updated}</td>
                  <td className="px-5 py-3">
                    <button className="text-slate-500 hover:text-slate-300 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
