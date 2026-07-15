"use client";

import { useState } from "react";
import {
  Search, Filter, ChevronDown, MessageSquare, Zap, FileText,
  Copy, CheckCircle, AlertTriangle, ArrowUpRight, Clock,
  User, X, Send, Plus, ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import { Button } from "../ui/button";

interface Ticket {
  id: string;
  subject: string;
  customer: string;
  email: string;
  status: "Open" | "Pending" | "Escalated" | "Resolved";
  priority: "High" | "Medium" | "Low";
  confidence: number;
  assignee: string;
  updated: string;
  messages: number;
}

const tickets: Ticket[] = [
  { id: "TKT-2891", subject: "Subscription inactive after successful payment", customer: "Sarah Chen", email: "s.chen@company.io", status: "Open", priority: "High", confidence: 0.94, assignee: "Jane D.", updated: "2m ago", messages: 3 },
  { id: "TKT-2888", subject: "Webhook delivery delayed for 30+ minutes", customer: "Marcus Webb", email: "m.webb@startup.co", status: "Escalated", priority: "High", confidence: 0.87, assignee: "Tom K.", updated: "15m ago", messages: 7 },
  { id: "TKT-2884", subject: "API authentication failing after key rotation", customer: "Priya Rajan", email: "priya@devco.com", status: "Open", priority: "Medium", confidence: 0.91, assignee: "Jane D.", updated: "1h ago", messages: 2 },
  { id: "TKT-2880", subject: "Duplicate billing charge on Oct statement", customer: "Daniel Park", email: "d.park@corp.net", status: "Pending", priority: "High", confidence: 0.78, assignee: "Unassigned", updated: "2h ago", messages: 4 },
  { id: "TKT-2876", subject: "Unable to invite team member — email not received", customer: "Lena Fischer", email: "l.fischer@techco.de", status: "Open", priority: "Medium", confidence: 0.85, assignee: "Tom K.", updated: "4h ago", messages: 1 },
  { id: "TKT-2870", subject: "Rate limiting hitting too aggressively on batch jobs", customer: "James O'Brien", email: "jobs@integrationsco.io", status: "Open", priority: "Low", confidence: 0.72, assignee: "Jane D.", updated: "6h ago", messages: 5 },
  { id: "TKT-2865", subject: "Dashboard not loading on Safari 17", customer: "Yuki Tanaka", email: "y.tanaka@design.jp", status: "Resolved", priority: "Medium", confidence: 0.96, assignee: "Tom K.", updated: "1d ago", messages: 9 },
];

const statusBadge = (s: Ticket["status"]) => {
  const m: Record<string, string> = {
    Open: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    Pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    Escalated: "bg-red-400/10 text-red-400 border-red-400/20",
    Resolved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  };
  return m[s];
};

const priorityBadge = (p: Ticket["priority"]) => {
  const m: Record<string, string> = {
    High: "text-red-400",
    Medium: "text-yellow-400",
    Low: "text-slate-400",
  };
  return m[p];
};

function TicketDetail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const [reply, setReply] = useState("");
  const [copied, setCopied] = useState(false);
  const [resolved, setResolved] = useState(false);

  const suggestedReply = `Hi ${ticket.customer.split(" ")[0]},\n\nThank you for reaching out. I've reviewed your account and can see the payment was processed successfully on ${new Date().toLocaleDateString()}.\n\nThe subscription activation is dependent on a webhook event (subscription.activated) which appears to have experienced a delivery delay. Our team has identified the issue and is manually triggering the activation now. You should see your subscription status update within the next 10–15 minutes.\n\nI'll send you a follow-up confirmation once the activation is complete. Please don't hesitate to reach out if you have any other questions.\n\nBest regards,\nThe Support Team`;

  const handleCopy = () => {
    setReply(suggestedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Ticket header */}
      <div className="px-5 py-4 border-b border-[#1E293B]">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300 mt-0.5 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-slate-500">{ticket.id}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(ticket.status)}`}>{ticket.status}</span>
              <span className={`text-[10px] font-semibold ${priorityBadge(ticket.priority)}`}>{ticket.priority}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100 leading-tight">{ticket.subject}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span>{ticket.customer}</span>
              <span>·</span>
              <span>{ticket.email}</span>
              <span>·</span>
              <span>{ticket.assignee}</span>
              <span>·</span>
              <span>{ticket.updated}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
              Escalate
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-white hover:bg-emerald-400 text-xs"
              onClick={() => setResolved(true)}
            >
              {resolved ? <CheckCircle className="w-3.5 h-3.5" /> : "Mark resolved"}
            </Button>
          </div>
        </div>
      </div>

      {/* Three column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation */}
        <div className="flex-1 flex flex-col border-r border-[#1E293B] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Customer message */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {ticket.customer[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-300">{ticket.customer}</span>
                  <span className="text-[10px] text-slate-600">Customer · 2h ago</span>
                </div>
                <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm text-slate-300 leading-relaxed">
                  Hi there! I was charged $49 for my Pro subscription yesterday but my account is still showing as Free. I need this fixed urgently as I can't access the features I paid for. Order ID: CH-28491-B
                </div>
              </div>
            </div>

            {/* Agent note */}
            <div className="flex gap-3 justify-end">
              <div>
                <div className="flex items-center gap-2 mb-1 justify-end">
                  <span className="text-[10px] text-slate-600">Internal note · 1h ago</span>
                  <span className="text-sm font-medium text-slate-300">Jane D.</span>
                </div>
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3 text-sm text-slate-400 leading-relaxed">
                  <span className="text-yellow-400 font-medium text-xs">Internal: </span>
                  Confirmed charge in Stripe. Checking webhook logs for activation event.
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-cyan-400/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 text-cyan-400">
                JD
              </div>
            </div>
          </div>

          {/* Reply composer */}
          <div className="border-t border-[#1E293B] p-4">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write a reply or paste the AI suggestion..."
              rows={4}
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-[#334155] transition-colors"
            />
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-medium text-xs">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Send response
              </Button>
              <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Internal note
              </Button>
            </div>
          </div>
        </div>

        {/* AI context panel */}
        <div className="hidden xl:flex flex-col w-80 2xl:w-96 bg-[#0B1220]">
          <div className="px-4 py-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-200">AI Context</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full ml-auto">{ticket.confidence} conf.</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">AI Summary</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customer was charged $49 successfully (Order: CH-28491-B) but subscription is still in Free state. Root cause is likely a failed webhook delivery for the <code className="font-mono text-slate-300">subscription.activated</code> event.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Root Cause</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Webhook endpoint returned <code className="font-mono text-red-300">502</code> at time of charge. Stripe attempted 3 retries, all failed. Subscription activation was never triggered.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Suggested Reply</div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{suggestedReply.substring(0, 180)}...</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 rounded-lg py-1.5 hover:bg-cyan-400/20 transition-colors"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy reply"}
                </button>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Sources Used</div>
              <div className="space-y-2">
                {[
                  { name: "Billing Runbook", chunk: "Chunk 04", score: "0.94" },
                  { name: "Support FAQ v3", chunk: "Chunk 11", score: "0.87" },
                ].map(src => (
                  <div key={src.name} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-400 flex-1">{src.name} · {src.chunk}</span>
                    <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 rounded text-[10px]">{src.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20 text-xs">
                <MessageSquare className="w-3 h-3 mr-1" /> Ask AI follow-up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState("Open");
  const [search, setSearch] = useState("");
  const tabs = ["Open", "Pending", "Escalated", "Resolved"];

  const filtered = tickets.filter(t => {
    const tabMatch = activeTab === "Open" ? t.status === "Open" :
      activeTab === "Pending" ? t.status === "Pending" :
      activeTab === "Escalated" ? t.status === "Escalated" : t.status === "Resolved";
    return tabMatch && (search === "" || t.subject.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase()));
  });

  const tabCounts = Object.fromEntries(tabs.map(t => [t, tickets.filter(tk => tk.status === t).length]));

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Ticket list */}
      <div className={`flex flex-col ${selectedTicket ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-[#1E293B]`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-50">Tickets</h1>
              <p className="text-xs text-slate-500 mt-0.5">{tickets.length} total · {tickets.filter(t => t.priority === "High").length} high priority</p>
            </div>
            <Button size="sm" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> New ticket
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border border-[#1E293B] rounded-xl overflow-hidden">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
                  ${activeTab === tab ? "bg-[#1E293B] text-slate-200" : "text-slate-500 hover:text-slate-300"}`}
              >
                {tab}
                <span className={`text-[9px] font-mono ${activeTab === tab ? "text-cyan-400" : "text-slate-600"}`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-[#1E293B] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#334155] transition-colors"
            />
          </div>
          <button className="px-2.5 py-1.5 border border-[#1E293B] rounded-lg text-slate-500 hover:text-slate-300 hover:border-[#334155]">
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-sm text-slate-500">No tickets in this view</div>
            </div>
          ) : filtered.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`px-4 py-3.5 hover:bg-[#0F172A] cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? "bg-cyan-400/5 border-r-2 border-r-cyan-400" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${ticket.priority === "High" ? "bg-red-400" : ticket.priority === "Medium" ? "bg-yellow-400" : "bg-slate-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-600">{ticket.id}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusBadge(ticket.status)}`}>{ticket.status}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-200 truncate mb-1">{ticket.subject}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <User className="w-3 h-3" />
                    <span>{ticket.customer}</span>
                    <span>·</span>
                    <span className={`font-mono ${ticket.confidence > 0.85 ? "text-emerald-400" : "text-yellow-400"}`}>{ticket.confidence} AI</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{ticket.updated}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket detail */}
      {selectedTicket ? (
        <div className="flex-1 overflow-hidden">
          <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-sm text-slate-500">Select a ticket to view details</div>
          </div>
        </div>
      )}
    </div>
  );
}
