"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle, Clock, CheckCircle, Users, Zap, FileText,
  ChevronRight, Plus, X, MessageSquare, Activity, Copy,
  AlertCircle, Shield, GitCommit, CheckSquare2
} from "lucide-react";
import { Button } from "../ui/button";
import { PreviewBanner } from "../layout/PreviewBanner";
import { SectionMark } from "../ui/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
    SEV1: "bg-red-500/20 text-red-700 border-red-400/30",
    SEV2: "bg-orange-500/20 text-orange-700 border-orange-400/30",
    SEV3: "bg-yellow-500/20 text-amber-700 border-yellow-400/30",
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
  { time: "13:12 UTC", label: "Incident detected", desc: "Monitoring alert triggered for webhook delivery failures", icon: AlertCircle, color: "text-red-700", borderColor: "border-red-400" },
  { time: "13:14 UTC", label: "Responders joined", desc: "Jane D. and Tom K. acknowledged the incident", icon: Users, color: "text-muted-foreground", borderColor: "border-border" },
  { time: "13:18 UTC", label: "Runbook opened", desc: "Billing Incident Response runbook accessed", icon: FileText, color: "text-brand", borderColor: "border-brand" },
  { time: "13:22 UTC", label: "AI recommendation created", desc: "ResolveAI suggested webhook replay and subscription manual activation", icon: Zap, color: "text-stone-700", borderColor: "border-violet-400" },
  { time: "13:35 UTC", label: "Approval requested", desc: "Manual activation of 47 affected subscriptions awaiting approval", icon: CheckSquare2, color: "text-amber-700", borderColor: "border-yellow-400" },
  { time: "13:41 UTC", label: "Action approved and deployed", desc: "Bulk subscription activation executed successfully", icon: CheckCircle, color: "text-signal", borderColor: "border-emerald-400" },
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
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground/80 mt-0.5 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${severityBadge(incident.severity)}`}>{incident.severity}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${statusColor(incident.status)} ${incident.status === "Active" ? "animate-pulse" : ""}`} />
                {incident.status}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
            </div>
            <h2 className="text-base font-semibold text-foreground leading-tight mb-1">{incident.title}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{incident.service}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{incident.responders} responders</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{incident.duration}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ComingSoon>
              <Button variant="outline" size="sm" disabled className="border-border text-muted-foreground bg-transparent text-xs cursor-not-allowed">
                <Plus className="w-3.5 h-3.5 mr-1" /> Update
              </Button>
            </ComingSoon>
            <ComingSoon>
              <Button size="sm" disabled className="bg-signal/50 text-white text-xs cursor-not-allowed">
                Resolve
              </Button>
            </ComingSoon>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-5 border-b border-border bg-background">
        {["overview", "timeline", "runbook", "actions"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm capitalize border-b-2 transition-colors ${activeTab === tab ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground/80"}`}
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
                <div key={label} className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                  <div className="text-sm font-medium text-foreground/80">{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-2">User Impact</div>
              <p className="text-sm text-foreground/80">Estimated 47 customers affected. Subscription purchases completing successfully but not activating due to webhook delivery failures. Customers unable to access paid features.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-brand" />
                <div className="text-[10px] font-semibold text-brand uppercase tracking-wider">AI Summary</div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">Root cause appears to be a webhook endpoint timeout triggered by a deployment at 12:47 UTC. The <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">subscription.activated</code> event failed to deliver to 47 affected accounts. Billing Runbook step 3 recommends manual activation as the immediate mitigation path.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-2">Next Recommended Action</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <CheckSquare2 className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="text-sm text-foreground/80">Submit bulk activation request to approvals queue</div>
                  <div className="text-xs text-muted-foreground">Requires owner approval · 47 accounts affected</div>
                </div>
                <ComingSoon>
                  <Button size="sm" disabled className="ml-auto bg-brand-soft text-brand border border-brand/20 text-xs flex-shrink-0 cursor-not-allowed">
                    Request approval
                  </Button>
                </ComingSoon>
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
                    <div className={`w-8 h-8 rounded-full border-2 ${evt.borderColor} bg-card flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${evt.color}`} />
                    </div>
                    {i < timelineEvents.length - 1 && <div className="w-px flex-1 bg-muted my-1 min-h-6" />}
                  </div>
                  <div className="pb-5 pt-1 flex-1">
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className="text-sm font-medium text-foreground">{evt.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{evt.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{evt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "runbook" && (
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-foreground">Billing Incident Response</span>
              <span className="text-[10px] text-muted-foreground ml-auto">3 of 6 steps complete</span>
            </div>
            <div className="space-y-2">
              {runbookSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border transition-colors
                    ${step.status === "done" ? "bg-emerald-400/5 border-signal/20" :
                    step.status === "current" ? "bg-brand/5 border-brand/30" :
                    "bg-card border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                      ${step.status === "done" ? "bg-emerald-400/20 border border-signal/20" :
                      step.status === "current" ? "bg-brand-soft border border-brand/30" :
                      "bg-muted border border-border"}`}>
                      {step.status === "done" ? (
                        <CheckCircle className="w-3.5 h-3.5 text-signal" />
                      ) : (
                        <span className={`text-[10px] font-mono font-bold ${step.status === "current" ? "text-brand" : "text-muted-foreground"}`}>{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium mb-0.5 ${step.status === "done" ? "text-signal line-through" : step.status === "current" ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{step.desc}</div>
                    </div>
                    {step.status === "current" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <ComingSoon>
                          <Button size="sm" disabled className="bg-brand-soft text-brand border border-brand/20 text-xs cursor-not-allowed">
                            Ask AI
                          </Button>
                        </ComingSoon>
                        <ComingSoon>
                          <Button size="sm" disabled className="bg-amber-50 text-amber-700 border border-amber-200 text-xs cursor-not-allowed">
                            Request approval
                          </Button>
                        </ComingSoon>
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
            <div className="bg-orange-400/5 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-700" />
                <span className="text-sm font-medium text-orange-700">High Risk · Pending approval</span>
              </div>
              <div className="text-base font-semibold text-foreground mt-2 mb-1">Bulk activate 47 subscriptions</div>
              <p className="text-xs text-muted-foreground mb-3">Manually trigger subscription.activated for all affected accounts in the last 2 hours where charge.succeeded was recorded but activation was not.</p>
              <div className="bg-card border border-border border-dashed rounded-lg p-3 mb-3">
                <div className="font-mono text-[10px] text-muted-foreground mb-1">PAYLOAD PREVIEW</div>
                <pre className="text-[11px] font-mono text-foreground/80 overflow-x-auto">{`{
  "action": "bulk_activate",
  "filter": {
    "charge_after": "2025-07-14T12:47:00Z",
    "status": "charge_succeeded_no_activation"
  },
  "count": 47
}`}</pre>
              </div>
              <div className="flex gap-2">
                <ComingSoon>
                  <Button size="sm" disabled className="bg-signal/50 text-white text-xs cursor-not-allowed">Approve</Button>
                </ComingSoon>
                <ComingSoon>
                  <Button variant="outline" size="sm" disabled className="border-red-400/30 text-red-700 bg-transparent text-xs cursor-not-allowed">Reject</Button>
                </ComingSoon>
                <ComingSoon>
                  <Button variant="outline" size="sm" disabled className="border-border text-muted-foreground bg-transparent text-xs cursor-not-allowed">Edit payload</Button>
                </ComingSoon>
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
    <div className="flex h-full bg-background overflow-hidden">
      {/* Incident list */}
      <div className={`flex flex-col ${selectedIncident ? "hidden lg:flex lg:w-[420px]" : "flex-1"} border-r border-border`}>
        {/* Active alert */}
        <div className="mx-4 mt-4 bg-red-50 border border-red-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
          <span className="text-sm font-medium text-red-700 flex-1">SEV1 active: Authentication service degraded in EU</span>
          <ChevronRight className="w-4 h-4 text-red-700/50 flex-shrink-0" />
        </div>

        <div className="px-5 py-4 border-b border-border mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 hidden sm:block">
                <SectionMark variant="shield" />
              </div>
              <div>
                <h1 className="font-display text-xl tracking-tight text-foreground">Incidents</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{incidents.filter(i => i.status !== "Resolved").length} active · {incidents.length} total</p>
              </div>
            </div>
            <ComingSoon>
              <Button size="sm" disabled className="bg-brand/40 text-brand-foreground/70 font-semibold text-xs cursor-not-allowed">
                <Plus className="w-3.5 h-3.5 mr-1" /> Declare incident
              </Button>
            </ComingSoon>
          </div>
          <div className="mt-3">
            <PreviewBanner>
              Incident command is a product preview with sample data. Live AI traces and approvals live under Agent Runs and Approvals.
            </PreviewBanner>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {incidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-border
                ${selectedIncident?.id === inc.id ? "border-brand/30 bg-brand/5" : "border-border"}
                ${inc.status === "Active" ? "border-l-2 border-l-red-400" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${severityBadge(inc.severity)}`}>{inc.severity}</span>
                    <span className={`flex items-center gap-1 text-xs text-muted-foreground`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor(inc.status)} ${inc.status === "Active" ? "animate-pulse" : ""}`} />
                      {inc.status}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{inc.id}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1 leading-tight">{inc.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{inc.service}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inc.responders}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inc.duration}</span>
                    <span>·</span>
                    <span>{inc.updated}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
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
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">Select an incident to view details</div>
          </div>
        </div>
      )}
    </div>
  );
}
