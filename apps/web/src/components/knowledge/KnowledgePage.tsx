"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, FileText, Search, RefreshCw,
  Trash2, AlertCircle, Loader2, CheckCircle,
  ChevronDown, Filter, Copy, X, Database
} from "lucide-react";
import { Button } from "../ui/button";
import {
  listKnowledgeSources,
  getKnowledgeSource,
  uploadKnowledgeFile,
  ingestKnowledgeSource,
  deleteKnowledgeSource,
  searchKnowledge,
} from "@/lib/api";
import type {
  KnowledgeSource,
  KnowledgeSourceDetail,
  KnowledgeSourceStatus,
  SearchKnowledgeResponse,
} from "@/types/knowledge";
import { formatRelativeTime } from "@/lib/format";

type DisplayStatus = "Ready for AI" | "Processing" | "Failed" | "Pending";

const STATUS_MAP: Record<KnowledgeSourceStatus, DisplayStatus> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Ready for AI",
  FAILED: "Failed",
};

function toDisplayStatus(status: KnowledgeSourceStatus): DisplayStatus {
  return STATUS_MAP[status] ?? "Pending";
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function fileExtLabel(source: KnowledgeSource): string {
  if (source.type === "URL") return "URL";
  if (source.type === "GITHUB") return "GITHUB";
  if (source.mimeType?.includes("pdf")) return "PDF";
  if (source.mimeType?.includes("markdown")) return "MD";
  if (source.mimeType?.includes("word") || source.mimeType?.includes("officedocument")) return "DOCX";
  if (source.type === "TEXT") return "TXT";
  return source.type;
}

const statusBadge = (status: DisplayStatus) => {
  const map: Record<DisplayStatus, string> = {
    "Ready for AI": "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    "Processing": "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    "Failed": "bg-red-400/10 text-red-400 border-red-400/20",
    "Pending": "bg-slate-400/10 text-slate-400 border-slate-400/20",
  };
  return map[status];
};

const statusIcon = (status: DisplayStatus) => {
  if (status === "Ready for AI") return <CheckCircle className="w-3 h-3" />;
  if (status === "Processing") return <Loader2 className="w-3 h-3 animate-spin" />;
  if (status === "Failed") return <AlertCircle className="w-3 h-3" />;
  return null;
};

export function KnowledgePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<KnowledgeSourceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [ragQuery, setRagQuery] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResults, setRagResults] = useState<SearchKnowledgeResponse["data"]["chunks"]>([]);

  const [chunkFilter, setChunkFilter] = useState("");
  const [chunkResults, setChunkResults] = useState<SearchKnowledgeResponse["data"]["chunks"]>([]);
  const [chunkSearching, setChunkSearching] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const [copiedChunk, setCopiedChunk] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reingesting, setReingesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError("");
    try {
      const res = await listKnowledgeSources();
      setSources(res.data.sources);
    } catch {
      setSourcesError("Couldn't load knowledge sources. Try refreshing.");
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    setDetailLoading(true);
    getKnowledgeSource(selectedId)
      .then(res => setSelectedDetail(res.data.source))
      .catch(() => setSelectedDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const filtered = sources.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyChunk = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedChunk(id);
    setTimeout(() => setCopiedChunk(null), 1500);
  };

  const handleFilePick = (file: File | null) => {
    if (!file) return;
    setUploadFile(file);
    if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");
    try {
      await uploadKnowledgeFile(uploadFile, uploadName || undefined);
      setShowUpload(false);
      setUploadFile(null);
      setUploadName("");
      loadSources();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRagSearch = async () => {
    const q = ragQuery.trim();
    if (!q) return;
    setRagLoading(true);
    try {
      const res = await searchKnowledge(q);
      setRagResults(res.data.chunks.slice(0, 3));
    } catch {
      setRagResults([]);
    } finally {
      setRagLoading(false);
    }
  };

  const handleChunkSearch = async () => {
    if (!selectedId) return;
    const q = chunkFilter.trim();
    if (!q) {
      setChunkResults([]);
      return;
    }
    setChunkSearching(true);
    try {
      const res = await searchKnowledge(q);
      setChunkResults(res.data.chunks.filter(c => c.source.id === selectedId));
    } catch {
      setChunkResults([]);
    } finally {
      setChunkSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this knowledge source? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteKnowledgeSource(selectedId);
      setSources(prev => prev.filter(s => s.id !== selectedId));
      setSelectedId(null);
      setSelectedDetail(null);
    } catch {
      // Non-fatal — leave the item in place if the delete failed.
    } finally {
      setDeleting(false);
    }
  };

  const handleReingest = async () => {
    if (!selectedId) return;
    setReingesting(true);
    try {
      await ingestKnowledgeSource(selectedId);
      const [srcRes, listRes] = await Promise.all([
        getKnowledgeSource(selectedId),
        listKnowledgeSources(),
      ]);
      setSelectedDetail(srcRes.data.source);
      setSources(listRes.data.sources);
    } catch {
      // Non-fatal — status will reflect whatever the backend left it at.
    } finally {
      setReingesting(false);
    }
  };

  const selected = selectedDetail;
  const selectedStatus = selected ? toDisplayStatus(selected.status) : null;
  const selectedChunksTotal = selected?.documents.reduce((sum, d) => sum + d.chunksCount, 0) ?? 0;

  return (
    <div className="flex h-full bg-[#020617]">
      {/* Source list */}
      <div className={`flex flex-col ${selectedId ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-[#1E293B]`}>
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
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFilePick(e.dataTransfer.files?.[0] ?? null);
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all
                  ${dragOver ? "border-cyan-400 bg-cyan-400/5" : "border-[#334155] hover:border-[#475569]"}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  className="hidden"
                  onChange={e => handleFilePick(e.target.files?.[0] ?? null)}
                />
                <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                <div className="text-xs text-slate-400">
                  {uploadFile ? uploadFile.name : "Drop file or click to browse"}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">PDF, TXT, Markdown, DOCX</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Source name</label>
                  <input
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="e.g. Billing Runbook"
                    className="w-full bg-[#0B1220] border border-[#334155] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 text-xs disabled:opacity-40"
                    disabled={!uploadFile || uploading}
                    onClick={handleUpload}
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upload & Ingest"}
                  </Button>
                </div>
              </div>
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
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
                onKeyDown={e => e.key === "Enter" && handleRagSearch()}
                placeholder="Payment successful but subscription not activated."
                className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <Button
                size="sm"
                className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/30 text-xs px-3 disabled:opacity-40"
                disabled={!ragQuery.trim() || ragLoading}
                onClick={handleRagSearch}
              >
                {ragLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
              </Button>
            </div>
            {ragResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {ragResults.map(chunk => (
                  <div key={chunk.id} className="bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-slate-500">Chunk {chunk.chunkIndex}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 rounded">
                        {chunk.score.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500">{chunk.source.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{chunk.chunkText}</p>
                    <button
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1.5 flex items-center gap-1"
                      onClick={() => handleCopyChunk(chunk.id, chunk.chunkText)}
                    >
                      <Copy className="w-3 h-3" />
                      {copiedChunk === chunk.id ? "Copied!" : "Copy context"}
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
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-600">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : sourcesError ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <div className="text-sm text-red-400 mb-3">{sourcesError}</div>
                <Button size="sm" className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs" onClick={loadSources}>
                  Retry
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-400 mb-1">No sources found</div>
                <div className="text-xs text-slate-600">Upload your first knowledge source to get started.</div>
              </div>
            ) : filtered.map(src => {
              const status = toDisplayStatus(src.status);
              return (
                <div
                  key={src.id}
                  onClick={() => { setSelectedId(src.id); setActiveTab("overview"); }}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#0F172A] cursor-pointer transition-colors ${selectedId === src.id ? "bg-cyan-400/5 border-r-2 border-r-cyan-400" : ""}`}
                >
                  <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{src.name}</span>
                      <span className="font-mono text-[10px] text-slate-600">{fileExtLabel(src)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {src.documentsCount ? `${src.documentsCount} docs · ` : ""}{formatBytes(src.sizeBytes)} · {formatRelativeTime(src.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusIcon(status)}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source detail */}
      {selectedId && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {detailLoading || !selected || !selectedStatus ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-[#1E293B] flex items-center gap-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-100">{selected.name}</h2>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(selectedStatus)}`}>
                      {statusIcon(selectedStatus)} {selectedStatus}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">{fileExtLabel(selected)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Updated {formatRelativeTime(selected.updatedAt)} · {formatBytes(selected.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] bg-transparent text-xs disabled:opacity-40"
                    disabled={reingesting}
                    onClick={handleReingest}
                  >
                    {reingesting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    Re-ingest
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 text-red-400 hover:bg-red-400/10 bg-transparent text-xs disabled:opacity-40"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 px-6 border-b border-[#1E293B] bg-[#020617]">
                {["overview", "documents", "chunks", "errors"].map(tab => (
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
                        { label: "Documents", value: selected.documents.length },
                        { label: "Chunks", value: selectedChunksTotal > 0 ? selectedChunksTotal.toLocaleString() : "—" },
                        { label: "Size", value: formatBytes(selected.sizeBytes) },
                        { label: "Created", value: new Date(selected.createdAt).toLocaleDateString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-center">
                          <div className="font-mono text-lg font-bold text-cyan-400">{value}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-400 mb-3">Source health</div>
                      {selectedStatus === "Ready for AI" && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-sm text-emerald-400">All chunks indexed successfully</span>
                        </div>
                      )}
                      {selectedStatus === "Processing" && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                          <span className="text-sm text-yellow-400">Processing document...</span>
                        </div>
                      )}
                      {selectedStatus === "Pending" && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-sm text-slate-400">Waiting to be ingested</span>
                        </div>
                      )}
                      {selectedStatus === "Failed" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">Ingestion failed — see Errors tab</span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs disabled:opacity-40"
                            disabled={reingesting}
                            onClick={handleReingest}
                          >
                            Retry ingestion
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-400 mb-3">Metadata</div>
                      <div className="space-y-2 text-sm">
                        {[
                          { k: "Source ID", v: selected.id },
                          { k: "Type", v: fileExtLabel(selected) },
                          { k: "Created by", v: selected.createdBy?.name ?? "—" },
                          { k: "File path", v: selected.filePath ?? "—" },
                          { k: "Token estimate", v: selectedChunksTotal > 0 ? `~${(selectedChunksTotal * 485).toLocaleString()} tokens` : "—" },
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
                      <span className="text-sm text-slate-400">{selectedChunksTotal} total chunks</span>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                        <input
                          value={chunkFilter}
                          onChange={e => setChunkFilter(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleChunkSearch()}
                          placeholder="Filter chunks..."
                          className="bg-[#0F172A] border border-[#1E293B] rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#334155] w-48"
                        />
                      </div>
                    </div>
                    {chunkSearching ? (
                      <div className="flex items-center justify-center py-10 text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : chunkResults.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-600">
                        {chunkFilter ? "No matching chunks in this source." : "Search this source's chunks by meaning above."}
                      </div>
                    ) : chunkResults.map(chunk => (
                      <div key={chunk.id} className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-xs text-slate-500">Chunk {chunk.chunkIndex}</span>
                          {chunk.tokenCount != null && (
                            <span className="font-mono text-[10px] text-slate-600">{chunk.tokenCount} tokens</span>
                          )}
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 rounded">
                            {chunk.score.toFixed(2)}
                          </span>
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => handleCopyChunk(chunk.id, chunk.chunkText)}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {copiedChunk === chunk.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{chunk.chunkText}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "errors" && (
                  <div className="max-w-lg">
                    {selectedStatus === "Failed" ? (
                      <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">Ingestion failed</span>
                        </div>
                        <div className="font-mono text-xs text-red-300 bg-red-400/10 rounded-lg p-3 mb-3">
                          {typeof selected.metadata?.error === "string"
                            ? selected.metadata.error
                            : "The ingestion pipeline reported a failure for this source. Check backend logs for details."}
                        </div>
                        <div className="text-xs text-slate-500 mb-3">
                          Occurred: {formatRelativeTime(selected.updatedAt)}
                        </div>
                        <Button
                          size="sm"
                          className="bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 text-xs border border-cyan-400/20 disabled:opacity-40"
                          disabled={reingesting}
                          onClick={handleReingest}
                        >
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
                    {selected.documents.length === 0 ? (
                      <div className="text-center py-12 text-slate-600 text-sm">No documents in this source yet.</div>
                    ) : (
                      <div className="divide-y divide-[#1E293B] bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
                        {selected.documents.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-300 truncate">{doc.title}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{doc.chunksCount} chunks</div>
                            </div>
                            <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}