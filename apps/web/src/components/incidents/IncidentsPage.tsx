"use client";

import { useState } from "react";
import {
  AlertTriangle, Clock, CheckCircle, Users, Zap, FileText,
  ChevronRight, Plus, X, MessageSquare, Activity, Copy,
  AlertCircle, Shield, GitCommit, CheckSquare2
} from "lucide-react";
import { Button } from "../ui/button";

interface Incident {
  id: string;
  title: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  status: "Active" | "Investigating" | "Mitigating" | "Resolved";
  service: string;
  owner: string;
  responders: number;
  updated: string;
  duration: string;
}

const incidents: Incident[] = [
  { id: "INC-47", title: "Payment webhooks delayed — subscriptions not activating", severity: "SEV2", status: "Active", service: "Billing / Webhooks", owner: "Jane D.", responders: 3, updated: "2m ago", duration: "1h 23m" },
  { id: "INC-46", title: "API rate limiter incorrectly throttling batch operations", severity: "SEV3", status: "Investigating", service: "API Gateway", owner: "Tom K.", responders: 2, updated: "45m ago", duration: "2h 10m" },
  { id: "INC-45", title: "Authentication service degraded in EU region", severity: "SEV1", status: "Mitigating", service: "Auth / IAM", owner: "Priya R.", responders: 5, updated: "15m ago", duration: "35m" },
  { id: "INC-44", title: "Dashboard rendering errors in Safari", severity: "SEV3", status: "Resolved", service: "Frontend", owner: "Marcus W.", responders: 1, updated: "2d ago", duration: "4h 22m" },
];

const severityBadge = (sev: Incident["severity"]) => {
  const m: Record<string, string> = {
    SEV1: "bg-red-500/20 text-red-400 border-red-400/30",
    SEV2: "bg-orange-500/20 text-orange-400 border-orange-400/30",
    SEV3: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30",
  };
  return m[sev];
};

const statusColor = (s: Incident["status"]) => {
  const m: Record<string, string> = {
    Active: "bg-red-400",
    Investigating: "bg-yellow-400",
    Mitigating: "bg-orange-400",
    Resolved: "bg-emerald-400",
  };
  return m[s];
};

const timelineEvents = [
  { time: "13:12 UTC", label: "Incident detected", desc: "Monitoring alert triggered for webhook delivery failures", icon: AlertCircle, color: "text-red-400", borderColor: "border-red-400" },
  { time: "13:14 UTC", label: "Responders joined", desc: "Jane D. and Tom K. acknowledged the incident", icon: Users, color: "text-slate-400", borderColor: "border-slate-600" },
  { time: "13:18 UTC", label: "Runbook opened", desc: "Billing Incident Response runbook accessed", icon: FileText, color: "text-cyan-400", borderColor: "border-cyan-400" },
  { time: "13:22 UTC", label: "AI recommendation created", desc: "ResolveAI suggested webhook replay and subscription manual activation", icon: Zap, color: "text-violet-400", borderColor: "border-violet-400" },
  { time: "13:35 UTC", label: "Approval requested", desc: "Manual activation of 47 affected subscriptions awaiting approval", icon: CheckSquare2, color: "text-yellow-400", borderColor: "border-yellow-400" },
  { time: "13:41 UTC", label: "Action approved and deployed", desc: "Bulk subscription activation executed successfully", icon: CheckCircle, color: "text-emerald-400", borderColor: "border-emerald-400" },
];

const runbookSteps = [
  { id: 1, label: "Confirm webhook endpoint is reachable", status: "done", desc: "Check /health endpoint and Stripe dashboard" },
  { id: 2, label: "Review recent webhook delivery logs", status: "done", desc: "Filter for subscription.activated events in last 2 hours" },
  { id: 3, label: "Identify affected subscriptions", status: "current", desc: "Query DB for charges with no corresponding activation" },
  { id: 4, label: "Request approval for bulk activation", status: "pending", desc: "Submit bulk action to approvals queue" },
  { id: 5, label: "Execute manual activation", status: "pending", desc: "Run activation script with approved payload" },
  { id: 6, label: "Verify and notify affected customers", status: "pending", desc: "Confirm activation and send customer notification" },
];

function IncidentDetail({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E293B]">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300 mt-0.5 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${severityBadge(incident.severity)}`}>{incident.severity}</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${statusColor(incident.status)} ${incident.status === "Active" ? "animate-pulse" : ""}`} />
                {incident.status}
              </span>
              <span className="font-mono text-xs text-slate-600">{incident.id}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100 leading-tight mb-1">{incident.title}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{incident.service}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{incident.responders} responders</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{incident.duration}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Update
            </Button>
            <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-400 text-xs">
              Resolve
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-5 border-b border-[#1E293B] bg-[#020617]">
        {["overview", "timeline", "runbook", "actions"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm capitalize border-b-2 transition-colors ${activeTab === tab ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "overview" && (
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Status", value: incident.status },
                { label: "Owner", value: incident.owner },
                { label: "Duration", value: incident.duration },
                { label: "Service", value: incident.service },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className="text-sm font-medium text-slate-300">{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">User Impact</div>
              <p className="text-sm text-slate-300">Estimated 47 customers affected. Subscription purchases completing successfully but not activating due to webhook delivery failures. Customers unable to access paid features.</p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">AI Summary</div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">Root cause appears to be a webhook endpoint timeout triggered by a deployment at 12:47 UTC. The <code className="font-mono text-xs text-slate-200 bg-[#1E293B] px-1 rounded">subscription.activated</code> event failed to deliver to 47 affected accounts. Billing Runbook step 3 recommends manual activation as the immediate mitigation path.</p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Next Recommended Action</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                  <CheckSquare2 className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-300">Submit bulk activation request to approvals queue</div>
                  <div className="text-xs text-slate-500">Requires owner approval · 47 accounts affected</div>
                </div>
                <Button size="sm" className="ml-auto bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20 text-xs flex-shrink-0">
                  Request approval
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="max-w-xl space-y-0">
            {timelineEvents.map((evt, i) => {
              const Icon = evt.icon;
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 ${evt.borderColor} bg-[#0F172A] flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${evt.color}`} />
                    </div>
                    {i < timelineEvents.length - 1 && <div className="w-px flex-1 bg-[#1E293B] my-1 min-h-6" />}
                  </div>
                  <div className="pb-5 pt-1 flex-1">
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className="text-sm font-medium text-slate-200">{evt.label}</span>
                      <span className="font-mono text-[10px] text-slate-500">{evt.time}</span>
                    </div>
                    <p className="text-xs text-slate-400">{evt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "runbook" && (
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-200">Billing Incident Response</span>
              <span className="text-[10px] text-slate-500 ml-auto">3 of 6 steps complete</span>
            </div>
            <div className="space-y-2">
              {runbookSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border transition-colors
                    ${step.status === "done" ? "bg-emerald-400/5 border-emerald-400/20" :
                    step.status === "current" ? "bg-cyan-400/5 border-cyan-400/30" :
                    "bg-[#0F172A] border-[#1E293B]"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                      ${step.status === "done" ? "bg-emerald-400/20 border border-emerald-400/30" :
                      step.status === "current" ? "bg-cyan-400/20 border border-cyan-400/30" :
                      "bg-slate-800 border border-slate-700"}`}>
                      {step.status === "done" ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className={`text-[10px] font-mono font-bold ${step.status === "current" ? "text-cyan-400" : "text-slate-500"}`}>{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium mb-0.5 ${step.status === "done" ? "text-emerald-400 line-through" : step.status === "current" ? "text-slate-100" : "text-slate-400"}`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-slate-500">{step.desc}</div>
                    </div>
                    {step.status === "current" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20 text-xs">
                          Ask AI
                        </Button>
                        <Button size="sm" className="bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 border border-yellow-400/20 text-xs">
                          Request approval
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="max-w-xl space-y-4">
            <div className="bg-orange-400/5 border border-orange-400/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">High Risk · Pending approval</span>
              </div>
              <div className="text-base font-semibold text-slate-200 mt-2 mb-1">Bulk activate 47 subscriptions</div>
              <p className="text-xs text-slate-400 mb-3">Manually trigger subscription.activated for all affected accounts in the last 2 hours where charge.succeeded was recorded but activation was not.</p>
              <div className="bg-[#0B1220] border border-[#334155] border-dashed rounded-lg p-3 mb-3">
                <div className="font-mono text-[10px] text-slate-500 mb-1">PAYLOAD PREVIEW</div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">{`{
  "action": "bulk_activate",
  "filter": {
    "charge_after": "2025-07-14T12:47:00Z",
    "status": "charge_succeeded_no_activation"
  },
  "count": 47
}`}</pre>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-400 text-xs">Approve</Button>
                <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs">Reject</Button>
                <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:bg-[#1E293B] bg-transparent text-xs">Edit payload</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function IncidentsPage() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Incident list */}
      <div className={`flex flex-col ${selectedIncident ? "hidden lg:flex lg:w-[420px]" : "flex-1"} border-r border-[#1E293B]`}>
        {/* Active alert */}
        <div className="mx-4 mt-4 bg-red-400/10 border border-red-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm font-medium text-red-400 flex-1">SEV1 active: Authentication service degraded in EU</span>
          <ChevronRight className="w-4 h-4 text-red-400/50 flex-shrink-0" />
        </div>

        <div className="px-5 py-4 border-b border-[#1E293B] mt-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-50">Incidents</h1>
              <p className="text-xs text-slate-500 mt-0.5">{incidents.filter(i => i.status !== "Resolved").length} active · {incidents.length} total</p>
            </div>
            <Button size="sm" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Declare incident
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {incidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`bg-[#0F172A] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#334155]
                ${selectedIncident?.id === inc.id ? "border-cyan-400/30 bg-cyan-400/5" : "border-[#1E293B]"}
                ${inc.status === "Active" ? "border-l-2 border-l-red-400" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${severityBadge(inc.severity)}`}>{inc.severity}</span>
                    <span className={`flex items-center gap-1 text-xs text-slate-400`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor(inc.status)} ${inc.status === "Active" ? "animate-pulse" : ""}`} />
                      {inc.status}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">{inc.id}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-200 mb-1 leading-tight">{inc.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{inc.service}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inc.responders}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inc.duration}</span>
                    <span>·</span>
                    <span>{inc.updated}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident detail */}
      {selectedIncident ? (
        <div className="flex-1 overflow-hidden">
          <IncidentDetail incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <AlertTriangle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-sm text-slate-500">Select an incident to view details</div>
          </div>
        </div>
      )}
    </div>
  );
}
