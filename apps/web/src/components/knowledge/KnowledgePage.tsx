"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, FileText, Search, RefreshCw,
  Trash2, AlertCircle, Loader2, CheckCircle,
  ChevronDown, Filter, Copy, X
} from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState, SectionMark } from "../ui/EmptyState";
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
    "Ready for AI": "bg-signal-soft text-signal border-signal/20",
    "Processing": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    "Failed": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    "Pending": "bg-muted text-muted-foreground border-border",
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

  // Poll while any source is still ingesting so status badges update live.
  useEffect(() => {
    const pending = sources.some(
      (s) => s.status === "PENDING" || s.status === "PROCESSING",
    );
    if (!pending) return;

    const timer = setInterval(() => {
      void listKnowledgeSources()
        .then((res) => setSources(res.data.sources))
        .catch(() => {
          /* keep last known list */
        });
    }, 4000);

    return () => clearInterval(timer);
  }, [sources]);

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
    <div className="flex h-full bg-background">
      {/* Source list */}
      <div className={`flex flex-col ${selectedId ? "hidden lg:flex lg:w-[420px] xl:w-[480px]" : "flex-1"} border-r border-border`}>
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 hidden sm:block">
                <SectionMark variant="stack" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xl tracking-tight text-foreground">Knowledge Base</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Sources ResolveAI cites for grounded answers.</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold text-xs shrink-0"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload source
            </Button>
          </div>

          {/* Upload panel */}
          {showUpload && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/80">Upload knowledge source</span>
                <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground/80">
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
                  ${dragOver ? "border-brand bg-brand/5" : "border-border hover:border-[#475569]"}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  className="hidden"
                  onChange={e => handleFilePick(e.target.files?.[0] ?? null)}
                />
                <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-xs text-muted-foreground">
                  {uploadFile ? uploadFile.name : "Drop file or click to browse"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">PDF, TXT, Markdown, DOCX</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Source name</label>
                  <input
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="e.g. Billing Runbook"
                    className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="w-full bg-brand text-brand-foreground hover:bg-brand/90 text-xs disabled:opacity-40"
                    disabled={!uploadFile || uploading}
                    onClick={handleUpload}
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upload & Ingest"}
                  </Button>
                </div>
              </div>
              {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
            </div>
          )}

          {/* Search + RAG test */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sources..."
                className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors"
              />
            </div>
            <button className="px-3 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground/80 hover:border-border transition-colors">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* RAG test */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search ingested knowledge</div>
            <div className="flex gap-2">
              <input
                value={ragQuery}
                onChange={e => setRagQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRagSearch()}
                placeholder="Payment successful but subscription not activated."
                className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
              />
              <Button
                size="sm"
                className="bg-brand-soft text-brand hover:bg-brand-soft border border-brand/30 text-xs px-3 disabled:opacity-40"
                disabled={!ragQuery.trim() || ragLoading}
                onClick={handleRagSearch}
              >
                {ragLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
              </Button>
            </div>
            {ragResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {ragResults.map(chunk => (
                  <div key={chunk.id} className="bg-card border border-border rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">Chunk {chunk.chunkIndex}</span>
                      <span className="text-[10px] font-mono text-signal bg-signal-soft px-1.5 rounded">
                        {chunk.score.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{chunk.source.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{chunk.chunkText}</p>
                    <button
                      className="text-[10px] text-brand hover:text-brand mt-1.5 flex items-center gap-1"
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
          <div className="divide-y divide-border">
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : sourcesError ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
                <div className="text-sm text-red-700 mb-3">{sourcesError}</div>
                <Button size="sm" className="bg-brand-soft text-brand hover:bg-brand-soft text-xs" onClick={loadSources}>
                  Retry
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                variant="knowledge"
                title={searchQuery ? "No sources match" : "No sources yet"}
                description={
                  searchQuery
                    ? "Try a different search term."
                    : "Upload a runbook, FAQ, or guide to ground your AI answers."
                }
                action={
                  !searchQuery ? (
                    <Button
                      size="sm"
                      className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload source
                    </Button>
                  ) : undefined
                }
              />
            ) : filtered.map(src => {
              const status = toDisplayStatus(src.status);
              return (
                <div
                  key={src.id}
                  onClick={() => { setSelectedId(src.id); setActiveTab("overview"); }}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-card cursor-pointer transition-colors ${selectedId === src.id ? "bg-brand/5 border-r-2 border-r-brand" : ""}`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{src.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{fileExtLabel(src)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
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
              <Loader2 className="w-5 h-5 text-brand animate-spin" />
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-border flex items-center gap-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden text-muted-foreground hover:text-foreground/80"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-foreground">{selected.name}</h2>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge(selectedStatus)}`}>
                      {statusIcon(selectedStatus)} {selectedStatus}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{fileExtLabel(selected)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Updated {formatRelativeTime(selected.updatedAt)} · {formatBytes(selected.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent text-xs disabled:opacity-40"
                    disabled={reingesting}
                    onClick={handleReingest}
                  >
                    {reingesting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    Re-ingest
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 text-red-700 hover:bg-red-50 bg-transparent text-xs disabled:opacity-40"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 px-6 border-b border-border bg-background">
                {["overview", "documents", "chunks", "errors"].map(tab => (
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
                        <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                          <div className="font-mono text-lg font-bold text-brand">{value}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="text-xs font-semibold text-muted-foreground mb-3">Source health</div>
                      {selectedStatus === "Ready for AI" && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-sm text-signal">All chunks indexed successfully</span>
                        </div>
                      )}
                      {selectedStatus === "Processing" && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
                          <span className="text-sm text-amber-700">Processing document...</span>
                        </div>
                      )}
                      {selectedStatus === "Pending" && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Waiting to be ingested</span>
                        </div>
                      )}
                      {selectedStatus === "Failed" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-700" />
                            <span className="text-sm text-red-700">Ingestion failed — see Errors tab</span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-brand-soft text-brand hover:bg-brand-soft text-xs disabled:opacity-40"
                            disabled={reingesting}
                            onClick={handleReingest}
                          >
                            Retry ingestion
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="text-xs font-semibold text-muted-foreground mb-3">Metadata</div>
                      <div className="space-y-2 text-sm">
                        {[
                          { k: "Source ID", v: selected.id },
                          { k: "Type", v: fileExtLabel(selected) },
                          { k: "Created by", v: selected.createdBy?.name ?? "—" },
                          { k: "File path", v: selected.filePath ?? "—" },
                          { k: "Token estimate", v: selectedChunksTotal > 0 ? `~${(selectedChunksTotal * 485).toLocaleString()} tokens` : "—" },
                        ].map(({ k, v }) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-mono text-xs text-muted-foreground truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "chunks" && (
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{selectedChunksTotal} total chunks</span>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <input
                          value={chunkFilter}
                          onChange={e => setChunkFilter(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleChunkSearch()}
                          placeholder="Filter chunks..."
                          className="bg-card border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-border w-48"
                        />
                      </div>
                    </div>
                    {chunkSearching ? (
                      <div className="flex items-center justify-center py-10 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : chunkResults.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground">
                        {chunkFilter ? "No matching chunks in this source." : "Search this source's chunks by meaning above."}
                      </div>
                    ) : chunkResults.map(chunk => (
                      <div key={chunk.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-xs text-muted-foreground">Chunk {chunk.chunkIndex}</span>
                          {chunk.tokenCount != null && (
                            <span className="font-mono text-[10px] text-muted-foreground">{chunk.tokenCount} tokens</span>
                          )}
                          <span className="font-mono text-[10px] text-signal bg-signal-soft px-1.5 rounded">
                            {chunk.score.toFixed(2)}
                          </span>
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => handleCopyChunk(chunk.id, chunk.chunkText)}
                              className="text-muted-foreground hover:text-foreground/80 transition-colors"
                            >
                              {copiedChunk === chunk.id ? <CheckCircle className="w-3.5 h-3.5 text-signal" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{chunk.chunkText}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "errors" && (
                  <div className="max-w-lg">
                    {selectedStatus === "Failed" ? (
                      <div className="bg-red-400/5 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-700" />
                          <span className="text-sm font-medium text-red-700">Ingestion failed</span>
                        </div>
                        <div className="font-mono text-xs text-red-300 bg-red-50 rounded-lg p-3 mb-3">
                          {typeof selected.metadata?.error === "string"
                            ? selected.metadata.error
                            : "The ingestion pipeline reported a failure for this source. Check backend logs for details."}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          Occurred: {formatRelativeTime(selected.updatedAt)}
                        </div>
                        <Button
                          size="sm"
                          className="bg-brand-soft text-brand hover:bg-brand-soft text-xs border border-brand/20 disabled:opacity-40"
                          disabled={reingesting}
                          onClick={handleReingest}
                        >
                          <RefreshCw className="w-3 h-3 mr-1.5" /> Retry ingestion
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                        <div className="text-sm">No errors recorded</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="max-w-2xl">
                    {selected.documents.length === 0 ? (
                      <EmptyState
                        compact
                        variant="knowledge"
                        title="No documents yet"
                        description="This source has no indexed documents."
                      />
                    ) : (
                      <div className="divide-y divide-border bg-card border border-border rounded-xl overflow-hidden">
                        {selected.documents.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground/80 truncate">{doc.title}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{doc.chunksCount} chunks</div>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
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