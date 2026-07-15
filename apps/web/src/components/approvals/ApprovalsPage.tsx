"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, AlertTriangle, Clock, FileText, Zap,
  Shield, ChevronRight, X, Edit3, Eye, Filter, ChevronDown,
  AlertCircle, User, Ticket, Activity
} from "lucide-react";
import { Button } from "../ui/button";

type RiskLevel = "High" | "Medium" | "Low";
type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Failed";

interface Approval {
  id: string;
  action: string;
  description: string;
  risk: RiskLevel;
  requestedBy: string;
  relatedTo: string;
  relatedType: "ticket" | "incident";
  created: string;
  status: ApprovalStatus;
  provider: string;
  model: string;
  sourcesUsed: number;
  payload: object;
  reasoning: string;
}

const approvals: Approval[] = [
  {
    id: "APR-291",
    action: "Create GitHub issue for repeated webhook timeout failures",
    description: "Open a tracked GitHub issue in the platform-reliability repo to document and track recurring webhook timeouts affecting subscription activation.",
    risk: "High",
    requestedBy: "ResolveAI Agent",
    relatedTo: "TKT-2891",
    relatedType: "ticket",
    created: "4m ago",
    status: "Pending",
    provider: "OpenRouter",
    model: "GPT-4o",
    sourcesUsed: 2,
    payload: { repo: "acme/platform-reliability", title: "Recurring webhook timeouts — subscription.activated", labels: ["bug", "webhooks", "p1"], body: "Multiple customer reports of successful charges with inactive subscriptions due to webhook delivery failures." },
    reasoning: "Based on 3 tickets in the last 2 hours describing the same root cause, creating a tracked GitHub issue will help engineering prioritize the fix and prevent future recurrence.",
  },
  {
    id: "APR-290",
    action: "Send escalation email to billing engineering team",
    description: "Notify the billing engineering on-call about the webhook failure affecting 47 subscriptions and request immediate investigation.",
    risk: "Medium",
    requestedBy: "ResolveAI Agent",
    relatedTo: "INC-47",
    relatedType: "incident",
    created: "12m ago",
    status: "Pending",
    provider: "OpenRouter",
    model: "GPT-4o",
    sourcesUsed: 3,
    payload: { to: "billing-oncall@acme.io", subject: "URGENT: 47 subscriptions not activating — webhook failure", priority: "P1" },
    reasoning: "The incident has been active for 1h 23m with 47 affected customers. Escalating to the billing engineering team is the recommended next step per the Billing Incident Response runbook.",
  },
  {
    id: "APR-289",
    action: "Bulk activate 47 affected subscriptions",
    description: "Manually trigger subscription activation for all accounts where a successful charge was recorded but no activation event was received in the past 2 hours.",
    risk: "High",
    requestedBy: "Jane D.",
    relatedTo: "INC-47",
    relatedType: "incident",
    created: "18m ago",
    status: "Pending",
    provider: "OpenRouter",
    model: "GPT-4o",
    sourcesUsed: 4,
    payload: { action: "bulk_activate", filter: { charge_after: "2025-07-14T12:47:00Z", status: "charge_succeeded_no_activation" }, count: 47 },
    reasoning: "Manual activation is the safest immediate mitigation for affected customers while the root cause is investigated. All 47 accounts have confirmed charges.",
  },
  {
    id: "APR-288",
    action: "Tag PagerDuty incident as SEV1 and page additional responders",
    description: "Upgrade the current SEV2 classification to SEV1 based on the number of affected customers and page the VP of Engineering.",
    risk: "Medium",
    requestedBy: "ResolveAI Agent",
    relatedTo: "INC-47",
    relatedType: "incident",
    created: "35m ago",
    status: "Approved",
    provider: "OpenRouter",
    model: "GPT-4o",
    sourcesUsed: 2,
    payload: { incident_id: "PD-4821", severity: "SEV1", page: ["vp-engineering", "billing-oncall"] },
    reasoning: "With 47 affected customers and growing duration, SEV1 classification is appropriate per the incident severity matrix.",
  },
  {
    id: "APR-287",
    action: "Send proactive status email to affected customers",
    description: "Notify all 47 affected customers that we are aware of the issue and working on a resolution.",
    risk: "Low",
    requestedBy: "Tom K.",
    relatedTo: "INC-47",
    relatedType: "incident",
    created: "1h ago",
    status: "Rejected",
    provider: "OpenRouter",
    model: "GPT-4o",
    sourcesUsed: 1,
    payload: { template: "subscription_activation_delay", recipients: 47, from: "support@acme.io" },
    reasoning: "Proactive customer communication reduces inbound ticket volume and improves trust during incidents.",
  },
];

const riskBadge = (risk: RiskLevel) => ({
  High: "bg-red-400/10 text-red-400 border-red-400/20",
  Medium: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  Low: "bg-slate-400/10 text-slate-400 border-slate-400/20",
}[risk]);

const statusBadge = (s: ApprovalStatus) => ({
  Pending: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  Approved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  Rejected: "bg-red-400/10 text-red-400 border-red-400/20",
  Failed: "bg-slate-400/10 text-slate-400 border-slate-400/20",
}[s]);

function ConfirmModal({
  approval,
  action,
  onConfirm,
  onCancel,
}: {
  approval: Approval;
  action: "approve" | "reject";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          {action === "approve" ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          )}
          <div>
            <div className="text-base font-semibold text-slate-100">
              {action === "approve" ? "Confirm approval" : "Reject action"}
            </div>
            <div className="text-xs text-slate-500">{approval.id} · {approval.risk} risk</div>
          </div>
        </div>

        {approval.risk === "High" && action === "approve" && (
          <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">This is a high-risk action. Review the payload carefully before approving. This action cannot be undone once executed.</p>
          </div>
        )}

        <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">Action</div>
          <div className="text-sm text-slate-300">{approval.action}</div>
        </div>

        {action === "reject" && (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Reason for rejection</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this action should not proceed..."
              rows={3}
              className="w-full bg-[#0B1220] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-red-400/50 transition-colors"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            className={`flex-1 font-semibold text-sm ${action === "approve" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-red-500 hover:bg-red-400 text-white"}`}
          >
            {action === "approve" ? "Approve action" : "Reject action"}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalDetail({
  approval,
  onClose,
  onAction,
}: {
  approval: Approval;
  onClose: () => void;
  onAction: (id: string, action: "Approved" | "Rejected") => void;
}) {
  const [modal, setModal] = useState<"approve" | "reject" | null>(null);
  const [editPayload, setEditPayload] = useState(false);

  const handleConfirm = (action: "approve" | "reject") => {
    onAction(approval.id, action === "approve" ? "Approved" : "Rejected");
    setModal(null);
  };

  return (
    <>
      {modal && (
        <ConfirmModal
          approval={approval}
          action={modal}
          onConfirm={() => handleConfirm(modal)}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-start gap-3">
            <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300 mt-1 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-slate-500">{approval.id}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${riskBadge(approval.risk)}`}>
                  <AlertCircle className="w-2.5 h-2.5" /> {approval.risk} risk
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(approval.status)}`}>
                  {approval.status}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-100 leading-tight">{approval.action}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{approval.requestedBy}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {approval.relatedType === "ticket" ? <Ticket className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  {approval.relatedTo}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{approval.created}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {approval.risk === "High" && approval.status === "Pending" && (
            <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">This is a <strong>high-risk action</strong>. Review all details carefully before approving. Execution cannot be undone.</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Action summary</div>
            <p className="text-sm text-slate-300 leading-relaxed">{approval.description}</p>
          </div>

          {/* AI Reasoning */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">AI Reasoning</div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{approval.reasoning}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1E293B] text-xs text-slate-500">
              <span>{approval.provider} · {approval.model}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{approval.sourcesUsed} sources</span>
            </div>
          </div>

          {/* Payload */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Payload preview</div>
              {approval.status === "Pending" && (
                <button
                  onClick={() => setEditPayload(!editPayload)}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Edit3 className="w-3 h-3" /> {editPayload ? "Done" : "Edit"}
                </button>
              )}
            </div>
            {editPayload ? (
              <textarea
                defaultValue={JSON.stringify(approval.payload, null, 2)}
                rows={8}
                className="w-full bg-[#0B1220] border border-[#334155] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 resize-none focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            ) : (
              <pre className="text-xs font-mono text-slate-300 bg-[#0B1220] border border-[#1E293B] rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(approval.payload, null, 2)}
              </pre>
            )}
          </div>

          {/* Audit note */}
          {approval.status === "Pending" && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Audit note (optional)</label>
              <textarea
                placeholder="Add a note explaining your decision..."
                rows={2}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-[#334155] transition-colors"
              />
            </div>
          )}
        </div>

        {/* Action footer */}
        {approval.status === "Pending" && (
          <div className="px-5 py-4 border-t border-[#1E293B] flex gap-3">
            <Button
              onClick={() => setModal("approve")}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
            <Button
              onClick={() => setModal("reject")}
              variant="outline"
              className="flex-1 border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent font-semibold text-sm"
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button
              variant="outline"
              className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent"
              onClick={() => setEditPayload(true)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {approval.status !== "Pending" && (
          <div className="px-5 py-4 border-t border-[#1E293B]">
            <div className={`flex items-center gap-2 text-sm font-medium ${approval.status === "Approved" ? "text-emerald-400" : "text-red-400"}`}>
              {approval.status === "Approved" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              Action {approval.status.toLowerCase()} · {approval.created}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const filterTabs = ["All", "Pending", "High risk", "Approved", "Rejected"];

export function ApprovalsPage() {
  const [selected, setSelected] = useState<Approval | null>(null);
  const [filter, setFilter] = useState("All");
  const [statuses, setStatuses] = useState<Record<string, ApprovalStatus>>({});

  const getStatus = (a: Approval): ApprovalStatus => statuses[a.id] ?? a.status;

  const filtered = approvals.filter(a => {
    const s = getStatus(a);
    if (filter === "All") return true;
    if (filter === "Pending") return s === "Pending";
    if (filter === "High risk") return a.risk === "High" && s === "Pending";
    if (filter === "Approved") return s === "Approved";
    if (filter === "Rejected") return s === "Rejected";
    return true;
  });

  const pendingCount = approvals.filter(a => getStatus(a) === "Pending").length;

  const handleAction = (id: string, action: "Approved" | "Rejected") => {
    setStatuses(prev => ({ ...prev, [id]: action }));
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: action } : null);
    }
  };

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* List panel */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-[#1E293B]`}>
        <div className="px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-50">Approvals</h1>
              <p className="text-xs text-slate-500 mt-0.5">{pendingCount} pending · human review required</p>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {filterTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === tab ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
              >
                {tab}
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] bg-yellow-400/10 text-yellow-400 px-1 rounded">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-sm text-slate-500">No approvals in this view</div>
            </div>
          ) : filtered.map(apr => {
            const s = getStatus(apr);
            return (
              <button
                key={apr.id}
                onClick={() => setSelected({ ...apr, status: s })}
                className={`w-full text-left p-4 bg-[#0F172A] border rounded-xl transition-all hover:border-[#334155]
                  ${selected?.id === apr.id ? "border-cyan-400/30 bg-cyan-400/5" : "border-[#1E293B]"}
                  ${s === "Pending" && apr.risk === "High" ? "border-l-2 border-l-red-400" : ""}
                `}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    <span className="font-mono text-[10px] text-slate-600">{apr.id}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${riskBadge(apr.risk)}`}>{apr.risk}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusBadge(s)}`}>{s}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                </div>
                <div className="text-sm font-medium text-slate-200 leading-tight mb-2">{apr.action}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                  <span>{apr.requestedBy}</span>
                  <span>·</span>
                  <span className="font-mono">{apr.relatedTo}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apr.created}</span>
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
            approval={selected}
            onClose={() => setSelected(null)}
            onAction={handleAction}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-sm text-slate-500">Select an approval to review</div>
            <div className="text-xs text-slate-600 mt-1">High-risk actions require your explicit approval</div>
          </div>
        </div>
      )}
    </div>
  );
}
