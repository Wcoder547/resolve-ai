"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, Search, MoreHorizontal, RefreshCw,
  Trash2, Eye, AlertCircle, Loader2, CheckCircle,
  ChevronDown, Filter, Copy, ChevronRight, X, Database
} from "lucide-react";
import { Button } from "../ui/button";

type Status = "Ready for AI" | "Processing" | "Failed" | "Pending";

interface Source {
  id: string;
  name: string;
  type: string;
  status: Status;
  docs: number;
  chunks: number;
  size: string;
  created: string;
  updated: string;
}

const sources: Source[] = [
  { id: "src_1", name: "Billing Runbook", type: "PDF", status: "Ready for AI", docs: 1, chunks: 234, size: "1.2 MB", created: "Jul 1", updated: "2h ago" },
  { id: "src_2", name: "Support FAQ v3", type: "DOCX", status: "Ready for AI", docs: 1, chunks: 892, size: "3.4 MB", created: "Jun 28", updated: "5h ago" },
  { id: "src_3", name: "API Reference", type: "MD", status: "Processing", docs: 1, chunks: 0, size: "892 KB", created: "Jul 14", updated: "12m ago" },
  { id: "src_4", name: "Incident Playbooks", type: "PDF", status: "Ready for AI", docs: 4, chunks: 156, size: "5.1 MB", created: "Jun 15", updated: "1d ago" },
  { id: "src_5", name: "Onboarding Guide", type: "PDF", status: "Failed", docs: 1, chunks: 0, size: "2.3 MB", created: "Jun 10", updated: "3d ago" },
  { id: "src_6", name: "Webhook Integration Docs", type: "MD", status: "Ready for AI", docs: 1, chunks: 67, size: "128 KB", created: "Jun 5", updated: "4d ago" },
  { id: "src_7", name: "Security Policies", type: "PDF", status: "Pending", docs: 1, chunks: 0, size: "456 KB", created: "Jul 14", updated: "just now" },
];

const chunks = [
  { idx: "001", tokens: 512, size: "1.8 KB", preview: "Subscription activation is triggered by the subscription.activated webhook event. If this event fails to deliver..." },
  { idx: "002", tokens: 489, size: "1.7 KB", preview: "When a payment succeeds, Stripe sends a charge.succeeded event followed by a subscription.activated event within..." },
  { idx: "003", tokens: 521, size: "1.9 KB", preview: "To manually activate a subscription, navigate to the admin panel at /admin/subscriptions and locate the affected..." },
  { idx: "004", tokens: 445, size: "1.6 KB", preview: "Common causes of subscription activation failure: 1) Webhook endpoint returned non-2xx response 2) Network timeout..." },
];

const statusBadge = (status: Status) => {
  const map: Record<Status, string> = {
    "Ready for AI": "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    "Processing": "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    "Failed": "bg-red-400/10 text-red-400 border-red-400/20",
    "Pending": "bg-slate-400/10 text-slate-400 border-slate-400/20",
  };
  return map[status];
};

const statusIcon = (status: Status) => {
  if (status === "Ready for AI") return <CheckCircle className="w-3 h-3" />;
  if (status === "Processing") return <Loader2 className="w-3 h-3 animate-spin" />;
  if (status === "Failed") return <AlertCircle className="w-3 h-3" />;
  return null;
};

export function KnowledgePage() {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedChunk, setCopiedChunk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = sources.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyChunk = (idx: string) => {
    setCopiedChunk(idx);
    setTimeout(() => setCopiedChunk(null), 1500);
  };

  return (
    <div className="flex h-full bg-[#020617]">
      {/* Source list */}
      <div className={`flex flex-col ${selectedSource ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-[#1E293B]`}>
        <div className="p-6 border-b border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-50">Knowledge Base</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage the sources ResolveAI uses to generate grounded answers.</p>
            </div>
            <Button
              size="sm"
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold text-xs"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload source
            </Button>
          </div>

          {/* Upload panel */}
          {showUpload && (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Upload knowledge source</span>
                <button onClick={() => setShowUpload(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all
                  ${dragOver ? "border-cyan-400 bg-cyan-400/5" : "border-[#334155] hover:border-[#475569]"}`}
              >
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" />
                <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                <div className="text-xs text-slate-400">Drop file or click to browse</div>
                <div className="text-[10px] text-slate-600 mt-1">PDF, TXT, Markdown, DOCX</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Source name</label>
                  <input
                    placeholder="e.g. Billing Runbook"
                    className="w-full bg-[#0B1220] border border-[#334155] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <Button size="sm" className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 text-xs">Upload & Ingest</Button>
                </div>
              </div>
            </div>
          )}

          {/* Search + RAG test */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sources..."
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#334155] transition-colors"
              />
            </div>
            <button className="px-3 py-2 border border-[#1E293B] rounded-lg text-slate-500 hover:text-slate-300 hover:border-[#334155] transition-colors">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* RAG test */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Search ingested knowledge</div>
            <div className="flex gap-2">
              <input
                value={ragQuery}
                onChange={e => setRagQuery(e.target.value)}
                placeholder="Payment successful but subscription not activated."
                className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <Button
                size="sm"
                className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/30 text-xs px-3"
                onClick={() => setRagResults(true)}
              >
                Search
              </Button>
            </div>
            {ragResults && ragQuery && (
              <div className="mt-3 space-y-2">
                {chunks.slice(0, 2).map(chunk => (
                  <div key={chunk.idx} className="bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-slate-500">Chunk {chunk.idx}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 rounded">0.94</span>
                      <span className="text-[10px] text-slate-500">Billing Runbook</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{chunk.preview}</p>
                    <button
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1.5 flex items-center gap-1"
                      onClick={() => handleCopyChunk(chunk.idx)}
                    >
                      <Copy className="w-3 h-3" />
                      {copiedChunk === chunk.idx ? "Copied!" : "Copy context"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sources table */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-[#1E293B]">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-400 mb-1">No sources found</div>
                <div className="text-xs text-slate-600">Upload your first knowledge source to get started.</div>
              </div>
            ) : filtered.map(src => (
              <div
                key={src.id}
                onClick={() => { setSelectedSource(src); setActiveTab("overview"); }}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#0F172A] cursor-pointer transition-colors ${selectedSource?.id === src.id ? "bg-cyan-400/5 border-r-2 border-r-cyan-400" : ""}`}
              >
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">{src.name}</span>
                    <span className="font-mono text-[10px] text-slate-600">{src.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {src.chunks > 0 ? `${src.chunks} chunks · ` : ""}{src.size} · {src.updated}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {statusIcon(src.status)}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(src.status)}`}>
                    {src.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source detail */}
      {selectedSource && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Detail header */}
          <div className="px-6 py-4 border-b border-[#1E293B] flex items-center gap-4">
            <button
              onClick={() => setSelectedSource(null)}
              className="lg:hidden text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-100">{selectedSource.name}</h2>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(selectedSource.status)}`}>
                  {statusIcon(selectedSource.status)} {selectedSource.status}
                </span>
                <span className="font-mono text-[10px] text-slate-600">{selectedSource.type}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Updated {selectedSource.updated} · {selectedSource.size}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-ingest
              </Button>
              <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-6 border-b border-[#1E293B] bg-[#020617]">
            {["overview", "documents", "chunks", "errors", "activity"].map(tab => (
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
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "overview" && (
              <div className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Documents", value: selectedSource.docs },
                    { label: "Chunks", value: selectedSource.chunks > 0 ? selectedSource.chunks.toLocaleString() : "—" },
                    { label: "Size", value: selectedSource.size },
                    { label: "Created", value: selectedSource.created },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-center">
                      <div className="font-mono text-lg font-bold text-cyan-400">{value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 mb-3">Source health</div>
                  {selectedSource.status === "Ready for AI" && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm text-emerald-400">All chunks indexed successfully</span>
                    </div>
                  )}
                  {selectedSource.status === "Processing" && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span className="text-sm text-yellow-400">Processing document...</span>
                    </div>
                  )}
                  {selectedSource.status === "Failed" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Ingestion failed — see Errors tab</span>
                      </div>
                      <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs">
                        Retry ingestion
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 mb-3">Metadata</div>
                  <div className="space-y-2 text-sm">
                    {[
                      { k: "Source ID", v: `src_${selectedSource.id}` },
                      { k: "File type", v: selectedSource.type },
                      { k: "Embedding model", v: "text-embedding-3-small" },
                      { k: "Chunk strategy", v: "Recursive character (512 tokens)" },
                      { k: "Token estimate", v: selectedSource.chunks > 0 ? `~${(selectedSource.chunks * 485).toLocaleString()} tokens` : "—" },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-mono text-xs text-slate-400 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chunks" && (
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{selectedSource.chunks} total chunks</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <input placeholder="Filter chunks..." className="bg-[#0F172A] border border-[#1E293B] rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#334155] w-48" />
                  </div>
                </div>
                {chunks.map(chunk => (
                  <div key={chunk.idx} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-slate-500">Chunk {chunk.idx}</span>
                      <span className="font-mono text-[10px] text-slate-600">{chunk.tokens} tokens</span>
                      <span className="font-mono text-[10px] text-slate-600">{chunk.size}</span>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleCopyChunk(chunk.idx)}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {copiedChunk === chunk.idx ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button className="text-slate-500 hover:text-slate-300 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{chunk.preview}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="max-w-lg space-y-0">
                {[
                  { event: "Uploaded", time: selectedSource.created + ", 2025", icon: Upload, color: "text-slate-400" },
                  { event: "Ingestion started", time: selectedSource.created + ", 2025 · 2s later", icon: Loader2, color: "text-yellow-400" },
                  { event: "Chunking complete", time: selectedSource.created + ", 2025 · 45s later", icon: CheckCircle, color: "text-emerald-400" },
                  { event: "Search tested", time: "2h ago", icon: Search, color: "text-cyan-400" },
                ].map((evt, i, arr) => {
                  const Icon = evt.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full border border-[#334155] bg-[#0F172A] flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${evt.color}`} />
                        </div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-[#1E293B] my-1 min-h-6" />}
                      </div>
                      <div className="pb-4 pt-1">
                        <div className="text-sm text-slate-300">{evt.event}</div>
                        <div className="text-xs text-slate-500">{evt.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "errors" && (
              <div className="max-w-lg">
                {selectedSource.status === "Failed" ? (
                  <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Ingestion failed</span>
                    </div>
                    <div className="font-mono text-xs text-red-300 bg-red-400/10 rounded-lg p-3 mb-3">
                      ParseError: Unable to extract text from encrypted PDF. The document appears to be password-protected.
                    </div>
                    <div className="text-xs text-slate-500 mb-3">Occurred: 3 days ago · Chunk: 1</div>
                    <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs border border-cyan-400/20">
                      <RefreshCw className="w-3 h-3 mr-1.5" /> Retry ingestion
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                    <div className="text-sm">No errors recorded</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="max-w-2xl">
                <div className="divide-y divide-[#1E293B] bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
                  {[{ title: selectedSource.name, mime: selectedSource.type === "PDF" ? "application/pdf" : selectedSource.type === "MD" ? "text/markdown" : "application/vnd.openxmlformats", size: selectedSource.size, created: selectedSource.created, status: selectedSource.status }].map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-300 truncate">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{doc.mime}</div>
                      </div>
                      <span className="text-xs text-slate-500">{doc.size}</span>
                      <span className="text-xs text-slate-500">{doc.created}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(doc.status as Status)}`}>{doc.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

