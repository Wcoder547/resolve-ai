"use client";

import { useState } from "react";
import {
  TrendingUp, MessageSquare, CheckCircle, Clock, Ticket,
  Activity, Plus, ChevronDown, BarChart3, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const conversationData = [
  { day: "Jul 8", conversations: 28, grounded: 26 },
  { day: "Jul 9", conversations: 34, grounded: 32 },
  { day: "Jul 10", conversations: 41, grounded: 38 },
  { day: "Jul 11", conversations: 29, grounded: 27 },
  { day: "Jul 12", conversations: 52, grounded: 49 },
  { day: "Jul 13", conversations: 48, grounded: 45 },
  { day: "Jul 14", conversations: 61, grounded: 58 },
];

const topicsData = [
  { topic: "Subscription activation", count: 47 },
  { topic: "Webhook delivery", count: 38 },
  { topic: "API authentication", count: 29 },
  { topic: "Billing & charges", count: 24 },
  { topic: "Team invitations", count: 18 },
  { topic: "Rate limiting", count: 14 },
];

const sourcesData = [
  { name: "Billing Runbook", queries: 89, color: "#22D3EE" },
  { name: "Support FAQ v3", queries: 72, color: "#818CF8" },
  { name: "API Reference", queries: 54, color: "#34D399" },
  { name: "Incident Playbooks", queries: 41, color: "#FBBF24" },
  { name: "Other", queries: 28, color: "#64748B" },
];

const groundingData = [
  { name: "Grounded", value: 94, color: "#10B981" },
  { name: "Not grounded", value: 6, color: "#334155" },
];

const gapQuestions = [
  { question: "How do I configure custom SLA thresholds?", attempts: 8, lastAsked: "2h ago", status: "No source", action: "Add knowledge" },
  { question: "What is the refund policy for annual plans?", attempts: 5, lastAsked: "5h ago", status: "No source", action: "Add knowledge" },
  { question: "How to migrate data between workspaces?", attempts: 4, lastAsked: "1d ago", status: "Weak source", action: "Improve source" },
  { question: "SSO configuration for Okta", attempts: 6, lastAsked: "3h ago", status: "No source", action: "Add knowledge" },
  { question: "Custom webhook retry configuration", attempts: 3, lastAsked: "1d ago", status: "No source", action: "Add knowledge" },
];

const metrics = [
  { label: "Total conversations", value: "312", change: "+28 today", trend: "up", icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
  { label: "Grounded answer rate", value: "94%", change: "+2% vs last week", trend: "up", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  { label: "Avg response time", value: "1.4s", change: "-0.2s vs last week", trend: "up", icon: Clock, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
  { label: "Tickets assisted", value: "147", change: "+19 this week", trend: "up", icon: Ticket, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  { label: "Resolution rate", value: "78%", change: "+5% vs last week", trend: "up", icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  { label: "Approval success", value: "91%", change: "Stable", trend: "neutral", icon: Activity, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" },
];

const dateRanges = ["Last 7 days", "Last 30 days", "Custom"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-2 text-xs">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}: <span className="font-mono font-medium text-slate-100">{p.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("Last 7 days");
  const [showDateMenu, setShowDateMenu] = useState(false);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI activity, knowledge performance, and support insights.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDateMenu(!showDateMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-300 hover:border-[#475569] transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            {dateRange}
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
          {showDateMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden z-10 shadow-xl">
              {dateRanges.map(r => (
                <button
                  key={r}
                  onClick={() => { setDateRange(r); setShowDateMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${dateRange === r ? "text-cyan-400 bg-cyan-400/10" : "text-slate-400 hover:text-slate-200 hover:bg-[#334155]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map(({ label, value, change, trend, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 hover:border-[#334155] transition-colors">
            <div className={`w-7 h-7 rounded-lg border ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className="font-mono text-xl font-bold text-slate-50">{value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</div>
            <div className={`text-[10px] mt-1.5 ${trend === "up" ? "text-emerald-400" : "text-slate-500"}`}>{change}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Conversations over time */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-sm font-semibold text-slate-200">Conversations over time</div>
              <div className="text-xs text-slate-500">Grounded vs total</div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Grounded</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={conversationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="conversations" name="Total" stroke="#22D3EE" strokeWidth={2} fill="url(#totalGrad)" />
              <Area type="monotone" dataKey="grounded" name="Grounded" stroke="#10B981" strokeWidth={2} fill="url(#groundedGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grounded vs Not */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Grounded answer rate</div>
          <div className="text-xs text-slate-500 mb-5">Last {dateRange.toLowerCase()}</div>
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
              <div className="font-mono text-3xl font-bold text-emerald-400">94%</div>
              <div className="text-xs text-slate-500">grounded</div>
            </div>
            <div className="flex gap-4 mt-4 text-[11px]">
              {groundingData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-400">{d.name}: <span className="text-slate-300 font-mono">{d.value}%</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Most used sources */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Most-used knowledge sources</div>
          <div className="text-xs text-slate-500 mb-5">By query count</div>
          <div className="space-y-3">
            {sourcesData.map(src => (
              <div key={src.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{src.name}</span>
                  <span className="font-mono text-slate-300">{src.queries}</span>
                </div>
                <div className="w-full bg-[#1E293B] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(src.queries / 89) * 100}%`, background: src.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most common topics */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-200 mb-1">Most common support topics</div>
          <div className="text-xs text-slate-500 mb-5">By question frequency</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topicsData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="topic" type="category" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Questions" fill="#22D3EE" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Knowledge gaps table */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div>
            <div className="text-sm font-semibold text-slate-200">Questions needing better knowledge</div>
            <div className="text-xs text-slate-500 mt-0.5">Topics where AI could not find grounded answers</div>
          </div>
          <button className="flex items-center gap-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-cyan-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add knowledge
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E293B]">
                {["Question", "Attempts", "Last asked", "Status", "Action"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {gapQuestions.map((q, i) => (
                <tr key={i} className="hover:bg-[#0B1220] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-slate-300">{q.question}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{q.attempts}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{q.lastAsked}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${q.status === "No source" ? "bg-red-400/10 text-red-400 border-red-400/20" : "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                      {q.action}
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
