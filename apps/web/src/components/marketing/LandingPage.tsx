"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, ArrowRight, Shield, Eye, Users, TrendingUp,
  Database, MessageSquare, Ticket, AlertTriangle, Activity,
  ChevronRight, Star, Copy, ExternalLink, BookOpen, FileText,
  GitBranch, Webhook, Lock, ClipboardList, Menu, X
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const trustItems = [
  { icon: CheckCircle, text: "Grounded answers" },
  { icon: Eye, text: "Visible sources" },
  { icon: Shield, text: "Human approval" },
  { icon: Activity, text: "Complete AI traceability" },
];

const workflowSteps = [
  {
    step: "01",
    title: "Upload knowledge",
    desc: "Upload runbooks, FAQs, technical guides, and product documentation in PDF, TXT, Markdown, or DOCX.",
    icon: Database,
  },
  {
    step: "02",
    title: "Ingest and organize",
    desc: "ResolveAI chunks, embeds, and indexes your documents into a searchable AI knowledge graph.",
    icon: GitBranch,
  },
  {
    step: "03",
    title: "Ask or investigate",
    desc: "Ask natural language questions or investigate support tickets against your entire knowledge base.",
    icon: MessageSquare,
  },
  {
    step: "04",
    title: "Resolve with verified sources",
    desc: "Receive grounded answers with exact source citations your team can inspect and verify.",
    icon: CheckCircle,
  },
];

const useCases = [
  {
    icon: Users,
    title: "Support teams",
    desc: "Answer repeated questions using verified company knowledge.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Activity,
    title: "Developers",
    desc: "Investigate technical issues and inspect every AI execution step.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: AlertTriangle,
    title: "Incident teams",
    desc: "Follow runbooks, coordinate actions, and maintain a complete timeline.",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },
  {
    icon: TrendingUp,
    title: "Support leaders",
    desc: "Identify knowledge gaps, unanswered questions, and team performance.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
];

function ProductPreview() {
  return (
    <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] overflow-hidden shadow-2xl shadow-cyan-400/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E293B] bg-[#0B1220]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <div className="ml-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>ResolveAI · AI Chat</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-sm bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3">
            <p className="text-sm text-slate-200">Why was the customer charged successfully but their subscription is still inactive?</p>
          </div>
        </div>

        {/* AI response */}
        <div className="space-y-3">
          {/* Response header */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <Zap className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-slate-300">ResolveAI</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-medium">
              ✓ Grounded
            </span>
            <span className="text-[10px] text-slate-500">GPT-4o · 1.2s</span>
            <span className="text-[10px] text-slate-500">2 sources</span>
          </div>

          {/* Answer */}
          <div className="bg-[#0B1220] rounded-xl border border-[#1E293B] p-4 space-y-3">
            <div>
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1.5">Direct Answer</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                A successful charge does not automatically activate a subscription. Activation is triggered by the <code className="text-cyan-300 font-mono text-xs bg-cyan-400/10 px-1 rounded">subscription.activated</code> webhook event. If the webhook delivery fails or the handler throws an error, the subscription remains in a <code className="text-yellow-300 font-mono text-xs bg-yellow-400/10 px-1 rounded">pending</code> state.
              </p>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1.5">Recommended Steps</div>
              <ol className="space-y-1.5 text-sm text-slate-300">
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-4 flex-shrink-0">1.</span><span>Check webhook delivery logs in the Stripe dashboard for failed events</span></li>
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-4 flex-shrink-0">2.</span><span>Verify the <code className="font-mono text-[11px] text-slate-200 bg-slate-700 px-1 rounded">subscription_id</code> is associated with the charge in your database</span></li>
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-4 flex-shrink-0">3.</span><span>Manually trigger activation via the admin API if the customer confirms payment</span></li>
              </ol>
            </div>
          </div>

          {/* Sources */}
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources Used</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Billing Runbook", doc: "Subscription Activation Guide", chunk: "Chunk 04", score: "0.94" },
                { name: "Support KB", doc: "Payment Troubleshooting", chunk: "Chunk 11", score: "0.87" },
              ].map((src, i) => (
                <div key={i} className="bg-[#0B1220] border border-[#1E293B] rounded-lg p-3 hover:border-[#334155] transition-colors cursor-pointer">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-slate-300 truncate">{src.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mb-1.5">{src.doc}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600">{src.chunk}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{src.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
              <Copy className="w-3 h-3" /> Copy answer
            </button>
            <button className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> Expand context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureSection({
  reverse, badge, title, desc, preview
}: {
  reverse?: boolean;
  badge: string;
  title: string;
  desc: string;
  preview: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} gap-12 lg:gap-16 items-center`}>
      <div className="flex-1 space-y-5">
        <span className="inline-block text-xs font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 rounded-full">
          {badge}
        </span>
        <h3 className="text-2xl lg:text-3xl font-bold text-slate-50 leading-tight">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{desc}</p>
      </div>
      <div className="flex-1 w-full">{preview}</div>
    </div>
  );
}

function KnowledgePreview() {
  return (
    <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Knowledge Base</span>
        <button className="text-xs bg-cyan-400 text-slate-950 font-medium px-3 py-1 rounded-lg">Upload source</button>
      </div>
      <div className="divide-y divide-[#1E293B]">
        {[
          { name: "Billing Runbook", type: "PDF", chunks: 234, status: "Ready for AI", statusColor: "text-emerald-400 bg-emerald-400/10" },
          { name: "Support FAQ v3", type: "DOCX", chunks: 892, status: "Ready for AI", statusColor: "text-emerald-400 bg-emerald-400/10" },
          { name: "API Reference", type: "MD", chunks: 0, status: "Processing", statusColor: "text-yellow-400 bg-yellow-400/10" },
          { name: "Incident Playbooks", type: "PDF", chunks: 156, status: "Ready for AI", statusColor: "text-emerald-400 bg-emerald-400/10" },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1E293B]/50 transition-colors">
            <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-300 truncate">{row.name}</div>
              <div className="text-[11px] text-slate-500">{row.type} · {row.chunks > 0 ? `${row.chunks} chunks` : "..."}</div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${row.statusColor}`}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketPreview() {
  return (
    <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">#TKT-2891</span>
          <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">High</span>
        </div>
        <div className="text-sm font-medium text-slate-200">Subscription inactive after successful payment</div>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-[#0B1220] rounded-lg border border-[#1E293B] p-3">
          <div className="text-[10px] font-semibold text-cyan-400 mb-2 uppercase tracking-wider">AI Summary</div>
          <p className="text-xs text-slate-400">Customer was charged $49/mo but subscription remains inactive. Webhook event <code className="font-mono text-slate-300">subscription.activated</code> was not received.</p>
        </div>
        <div className="bg-[#0B1220] rounded-lg border border-[#1E293B] p-3">
          <div className="text-[10px] font-semibold text-cyan-400 mb-2 uppercase tracking-wider">Suggested Reply</div>
          <p className="text-xs text-slate-400">Hi Sarah, I've reviewed your account and confirmed the charge was processed. Our team is investigating a webhook delivery issue that prevented activation. I'll manually activate your subscription within 15 minutes.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 text-xs bg-cyan-400 text-slate-950 font-medium py-1.5 rounded-lg">Copy & Send</button>
          <button className="text-xs border border-[#334155] text-slate-400 px-3 py-1.5 rounded-lg">Escalate</button>
        </div>
      </div>
    </div>
  );
}

function ApprovalPreview() {
  return (
    <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E293B] flex items-center gap-2">
        <span className="text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">High Risk</span>
        <span className="text-sm text-slate-400">Approval required</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Proposed action</div>
          <div className="text-sm font-medium text-slate-200">Create GitHub issue for repeated webhook timeout failures</div>
        </div>
        <div className="bg-[#0B1220] rounded-lg border border-[#334155] border-dashed p-3">
          <div className="text-[10px] font-mono text-slate-500 mb-1">PAYLOAD PREVIEW</div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-hidden">{`{
  "title": "Webhook timeouts — TKT-2891",
  "labels": ["bug", "webhooks"],
  "body": "Customer reports..."
}`}</pre>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 text-xs bg-emerald-500 text-white font-medium py-1.5 rounded-lg hover:bg-emerald-400 transition-colors">Approve</button>
          <button className="flex-1 text-xs border border-red-400/30 text-red-400 py-1.5 rounded-lg">Reject</button>
          <button className="text-xs border border-[#334155] text-slate-400 px-3 py-1.5 rounded-lg">Edit</button>
        </div>
      </div>
    </div>
  );
}

function AgentRunPreview() {
  const steps = [
    { label: "Retrieval", status: "done", time: "0ms", duration: "210ms" },
    { label: "Context selection", status: "done", time: "210ms", duration: "45ms" },
    { label: "LLM call", status: "done", time: "255ms", duration: "890ms" },
    { label: "Tool call", status: "done", time: "1.15s", duration: "320ms" },
    { label: "Approval", status: "pending", time: "—", duration: "—" },
  ];
  return (
    <div className="bg-[#0F172A] rounded-xl border border-[#1E293B] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E293B] flex items-center gap-2">
        <span className="font-mono text-[11px] text-slate-500">run_7f3k2m9x</span>
        <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-full">Completed</span>
        <span className="text-[10px] text-slate-500 ml-auto">GPT-4o · 1.47s · 2,341 tokens</span>
      </div>
      <div className="p-4 space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                ${step.status === "done" ? "border-emerald-400 bg-emerald-400/10" : "border-slate-600 bg-slate-800"}
              `}>
                {step.status === "done" && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-slate-600" />}
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 bg-[#1E293B] my-1" />}
            </div>
            <div className="pb-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{step.label}</span>
                {step.duration !== "—" && <span className="font-mono text-[10px] text-slate-500">{step.duration}</span>}
              </div>
              {i === 2 && (
                <div className="mt-1.5 text-[11px] font-mono text-slate-500 bg-[#0B1220] rounded px-2 py-1.5 border border-[#1E293B]">
                  model: gpt-4o · tokens: 2,341
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#1E293B] bg-[#020617]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="font-semibold text-slate-50 text-[15px]">
                Resolve<span className="text-cyan-400">AI</span>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-6 text-sm text-slate-400">
              {["Product", "Solutions", "How it works", "Security", "Pricing", "Documentation"].map(item => (
                <button key={item} className="hover:text-slate-200 transition-colors">{item}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="hidden sm:block text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Sign in
            </button>
            <Button
              size="sm"
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold"
              onClick={() => router.push("/register")}
            >
              Start free
            </Button>
            <button
              className="lg:hidden text-slate-400 hover:text-slate-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#1E293B] px-4 py-4 space-y-3 bg-[#0F172A]">
            {["Product", "Solutions", "How it works", "Security", "Pricing", "Documentation"].map(item => (
              <button key={item} className="block text-sm text-slate-400 hover:text-slate-200 transition-colors w-full text-left">
                {item}
              </button>
            ))}
            <button onClick={() => router.push("/login")} className="block text-sm text-slate-400 w-full text-left">Sign in</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Grounded AI for support and incident resolution
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-50 leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto">
            Resolve support issues with AI that cites your knowledge base.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your runbooks, product documentation, and support knowledge. ResolveAI turns them into grounded answers, suggested responses, and transparent AI workflows your team can trust.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold px-6 h-11 text-sm"
              onClick={() => router.push("/register")}
            >
              Start free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-[#334155] text-slate-300 hover:text-slate-50 hover:bg-[#1E293B] h-11 px-6 text-sm bg-transparent"
              onClick={() => router.push("/dashboard")}
            >
              View product demo
            </Button>
          </div>
          <p className="text-xs text-slate-600 mt-3">No credit card required</p>
        </div>

        {/* Hero product preview */}
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-cyan-400/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 rounded-2xl bg-cyan-400/3 blur-2xl pointer-events-none" />
          <ProductPreview />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[#1E293B] bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustItems.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-slate-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-4">
            From scattered documentation to confident resolution.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent" />
          {workflowSteps.map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="relative bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 hover:border-[#334155] transition-colors">
              <div className="font-mono text-xs text-slate-600 mb-3">{step}</div>
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-24">
        <FeatureSection
          badge="Knowledge Management"
          title="Knowledge that is ready for AI."
          desc="Upload your runbooks, policies, and product guides. ResolveAI ingests and indexes them so every answer is backed by your exact documentation."
          preview={<KnowledgePreview />}
        />
        <FeatureSection
          reverse
          badge="AI Chat"
          title="Answers your team can verify."
          desc="Every response comes with exact source citations, chunk references, and relevance scores. Your team always knows what the AI used to generate an answer."
          preview={<ProductPreview />}
        />
        <FeatureSection
          badge="Ticket Resolution"
          title="Resolve tickets with human-reviewed AI."
          desc="AI reads each ticket, summarizes the issue, suggests a customer reply, and cites the exact knowledge source. Agents review and send—never automatically."
          preview={<TicketPreview />}
        />
        <FeatureSection
          reverse
          badge="Approvals"
          title="Keep risky actions under human control."
          desc="AI-proposed actions with payload previews require explicit human approval. High-risk actions show warnings and require confirmation before execution."
          preview={<ApprovalPreview />}
        />
        <FeatureSection
          badge="Agent Observability"
          title="Understand every AI decision."
          desc="Inspect every retrieval step, LLM call, tool use, and approval in a complete run trace. Every AI execution is fully auditable."
          preview={<AgentRunPreview />}
        />
      </section>

      {/* Use cases */}
      <section className="bg-[#0B1220] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-50 mb-4">Built for every role in support operations.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={`bg-[#0F172A] border rounded-xl p-5 hover:border-[#334155] transition-colors ${bg.split(" ")[1]}`}>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI trust section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-5">
              AI you can inspect, verify, and control.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              ResolveAI makes every AI decision transparent. See exactly what documents were retrieved, what model was used, and whether a human approved the action.
            </p>
            <div className="space-y-3">
              {[
                { label: "Grounding status", value: "Grounded · 2 sources" },
                { label: "Provider / Model", value: "OpenRouter · GPT-4o" },
                { label: "Retrieved chunks", value: "4 chunks · avg 0.91 score" },
                { label: "Human approval", value: "Required for high-risk actions" },
                { label: "Audit history", value: "Full execution log retained" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm text-slate-300 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-slate-200">AI Transparency Panel</span>
            </div>
            {[
              { key: "Grounding", val: "✓ Grounded", color: "text-emerald-400" },
              { key: "Sources used", val: "Billing Runbook, Support KB" },
              { key: "Provider", val: "OpenRouter" },
              { key: "Model", val: "gpt-4o" },
              { key: "Confidence", val: "0.94 avg match score", color: "text-cyan-400" },
              { key: "Human approval", val: "Not required for this action" },
            ].map(({ key, val, color }) => (
              <div key={key} className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">{key}</span>
                <span className={color || "text-slate-300"}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-[#0B1220] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-50 mb-3">Built for secure teams.</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Lock, text: "Role-based access" },
              { icon: Shield, text: "Masked API keys" },
              { icon: CheckCircle, text: "Human approvals" },
              { icon: ClipboardList, text: "Audit logs" },
              { icon: BookOpen, text: "Org-level controls" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-2 p-4 bg-[#0F172A] border border-[#1E293B] rounded-xl text-center">
                <Icon className="w-5 h-5 text-cyan-400" />
                <span className="text-xs text-slate-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-5">
          Turn your support knowledge into confident action.
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Give your team grounded answers, visible sources, and control over every AI-assisted workflow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold px-8 h-11"
            onClick={() => router.push("/register")}
          >
            Start free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="border-[#334155] text-slate-300 hover:text-white hover:bg-[#1E293B] h-11 px-8 bg-transparent"
          >
            Book a demo
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="font-semibold text-slate-50">Resolve<span className="text-cyan-400">AI</span></span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Grounded AI support and incident resolution.</p>
            </div>
            {[
              { heading: "Product", items: ["Knowledge Base", "AI Chat", "Tickets", "Incidents", "Approvals", "Agent Runs"] },
              { heading: "Solutions", items: ["Support Teams", "Developers", "Incident Teams", "Leaders"] },
              { heading: "Resources", items: ["Documentation", "API Reference", "Changelog", "Status"] },
              { heading: "Company", items: ["About", "Blog", "Careers", "Contact"] },
            ].map(({ heading, items }) => (
              <div key={heading}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{heading}</div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#1E293B] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-600">© 2025 ResolveAI. All rights reserved.</span>
            <div className="flex gap-4 text-xs text-slate-600">
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Legal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
