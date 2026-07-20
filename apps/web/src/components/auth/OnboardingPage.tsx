"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, Upload, FileText, Loader2,
  AlertCircle, ChevronRight, Database, MessageSquare, Eye
} from "lucide-react";
import { Button } from "../ui/button";
import { uploadKnowledgeFile, getKnowledgeSource, ingestKnowledgeSource } from "@/lib/api";

const steps = [
  { id: 1, label: "Create workspace", icon: Zap, done: true },
  { id: 2, label: "Upload knowledge source", icon: Upload, done: false },
  { id: 3, label: "Ingest document", icon: Database, done: false },
  { id: 4, label: "Ask first question", icon: MessageSquare, done: false },
  { id: 5, label: "Review grounded answer", icon: Eye, done: false },
];

type UploadState = "idle" | "uploading" | "processing" | "done" | "failed";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // ~1 minute of polling before giving up

export function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentStep, setCurrentStep] = useState(2);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [resultStats, setResultStats] = useState<{ documents: number; chunks: number } | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
  }, []);

  const pollStatus = useCallback((id: string, attempt = 0) => {
    getKnowledgeSource(id)
      .then((res) => {
        const source = res.data.source;

        if (source.status === "COMPLETED") {
          const chunks = source.documents.reduce((sum, d) => sum + d.chunksCount, 0);
          setResultStats({ documents: source.documents.length, chunks });
          setUploadState("done");
          setCurrentStep(4);
          return;
        }

        if (source.status === "FAILED") {
          setUploadError("Ingestion failed while processing this document. You can try again.");
          setUploadState("failed");
          return;
        }

        if (attempt >= MAX_POLL_ATTEMPTS) {
          setUploadError(
            "This is taking longer than expected. You can check its status on the Knowledge Base page.",
          );
          setUploadState("failed");
          return;
        }

        pollTimeout.current = setTimeout(() => pollStatus(id, attempt + 1), POLL_INTERVAL_MS);
      })
      .catch(() => {
        setUploadError("Couldn't check processing status. Check the Knowledge Base page for updates.");
        setUploadState("failed");
      });
  }, []);

  const handleFile = async (file: File) => {
    const allowed = [".pdf", ".txt", ".md", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError("Unsupported file type. Allowed: PDF, TXT, MD, DOCX.");
      setUploadState("failed");
      return;
    }

    setFileName(file.name);
    setSourceName((prev) => prev || file.name.replace(/\.[^.]+$/, ""));
    setUploadError("");
    setUploadState("uploading");

    try {
      const res = await uploadKnowledgeFile(file, sourceName || undefined);
      const newSourceId = res.data.source.id;
      setSourceId(newSourceId);
      setUploadState("processing");
      pollStatus(newSourceId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploadState("failed");
    }
  };

  const handleRetry = async () => {
    setUploadError("");
    // Upload itself never completed — just let them pick a file again.
    if (!sourceId) {
      setUploadState("idle");
      return;
    }
    // Upload succeeded but ingestion failed/timed out — retry ingestion on the same source.
    setUploadState("processing");
    try {
      await ingestKnowledgeSource(sourceId);
      pollStatus(sourceId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Retry failed. Please try again.");
      setUploadState("failed");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex">
      {/* Left stepper */}
      <div className="hidden lg:flex flex-col w-72 bg-[#0F172A] border-r border-[#1E293B] p-8">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-semibold text-slate-50 text-[15px]">Resolve<span className="text-cyan-400">AI</span></span>
        </div>

        <div className="mb-8">
          <div className="text-sm font-semibold text-slate-200 mb-1">Getting started</div>
          <div className="text-xs text-slate-500">Set up your workspace in a few steps</div>
        </div>

        <div className="space-y-1">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const done = step.id < currentStep;
            const active = step.id === currentStep;
            return (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border
                    ${done ? "border-emerald-400 bg-emerald-400/10" : active ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-800"}
                  `}>
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-px flex-1 my-1 min-h-6 ${done ? "bg-emerald-400/30" : "bg-[#1E293B]"}`} />
                  )}
                </div>
                <div className="pb-4 pt-1">
                  <div className={`text-sm ${done ? "text-emerald-400" : active ? "text-slate-200 font-medium" : "text-slate-500"}`}>
                    {step.label}
                  </div>
                  {done && <div className="text-xs text-slate-600">Completed</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          {uploadState !== "done" ? (
            <>
              <div className="mb-8">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Step 2 of 5</div>
                <h1 className="text-2xl font-bold text-slate-50 mb-2">Add your first knowledge source.</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Upload a runbook, FAQ, technical guide, or product documentation file. ResolveAI will process and index it so your team can get grounded answers.
                </p>
              </div>

              {/* Upload zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => uploadState === "idle" && fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
                  ${dragOver ? "border-cyan-400 bg-cyan-400/5" : uploadState === "failed" ? "border-red-400 bg-red-400/5" : "border-[#334155] hover:border-[#475569] hover:bg-[#0F172A]"}
                `}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                {uploadState === "idle" && (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-300 mb-1">Drop your file here, or click to browse</div>
                    <div className="text-xs text-slate-500">Supports PDF, TXT, Markdown, and DOCX</div>
                  </>
                )}

                {uploadState === "uploading" && (
                  <div className="flex items-center gap-3 bg-[#0F172A] border border-[#1E293B] rounded-lg p-3 text-left">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-300 truncate">{fileName}</div>
                      <div className="text-xs text-slate-500">Uploading...</div>
                    </div>
                  </div>
                )}

                {uploadState === "processing" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-[#0F172A] border border-[#1E293B] rounded-lg p-3 text-left">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-slate-300">{fileName}</div>
                        <div className="text-xs text-slate-500">Processing document...</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">Chunking, embedding, and indexing your document. This may take a moment.</div>
                  </div>
                )}

                {uploadState === "failed" && (
                  <div className="space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <div className="text-sm text-red-400">{uploadError || "Something went wrong. Please try again."}</div>
                    <button
                      onClick={e => { e.stopPropagation(); handleRetry(); }}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>

              {uploadState === "idle" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Source name (optional)</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    placeholder="e.g. Billing Runbook"
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Ready for AI</div>
              <h2 className="text-2xl font-bold text-slate-50 mb-3">Knowledge ingested successfully!</h2>
              <p className="text-slate-400 text-sm mb-2">
                <span className="text-slate-300 font-medium">{sourceName || fileName}</span> has been chunked, embedded, and is ready for AI queries.
              </p>
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 mb-8 text-left">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-cyan-400 font-mono">{resultStats?.documents ?? "—"}</div>
                    <div className="text-xs text-slate-500">Document{resultStats?.documents === 1 ? "" : "s"}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-400 font-mono">{resultStats?.chunks ?? "—"}</div>
                    <div className="text-xs text-slate-500">Chunks</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold h-10"
                  onClick={() => router.push("/chat")}
                >
                  Ask AI from this source <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
                >
                  Go to dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}