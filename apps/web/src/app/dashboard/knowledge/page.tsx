"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  deleteKnowledgeSource,
  ingestKnowledgeSource,
  listKnowledgeSources,
  logoutUser,
  searchKnowledge,
  uploadKnowledgeFile,
} from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import type {
  KnowledgeSource,
  KnowledgeSourceStatus,
  SearchKnowledgeResponse,
} from "@/types/knowledge";

function formatBytes(size?: number | null) {
  if (!size) return "N/A";

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value = value / 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getStatusClass(status: KnowledgeSourceStatus) {
  if (status === "COMPLETED") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (status === "PROCESSING") {
    return "bg-yellow-400/10 text-yellow-300";
  }

  if (status === "FAILED") {
    return "bg-red-400/10 text-red-300";
  }

  return "bg-slate-800 text-slate-300";
}

export default function KnowledgeBasePage() {
  const router = useRouter();

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<
    SearchKnowledgeResponse["data"]["chunks"]
  >([]);
  const [ragContext, setRagContext] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSources = useCallback(async () => {
    try {
      setError("");
      const response = await listKnowledgeSources();
      setSources(response.data.sources);
    } catch (err) {
      if (err instanceof Error && err.message.includes("No access token")) {
        clearTokens();
        router.push("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to load sources.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    if (!sourceName.trim()) {
      setSourceName(selectedFile.name);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await uploadKnowledgeFile(file, sourceName);
      setMessage("Knowledge source uploaded successfully.");
      setFile(null);
      setSourceName("");

      const fileInput = document.getElementById(
        "knowledge-file",
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIngest(sourceId: string) {
    setIngestingId(sourceId);
    setError("");
    setMessage("");

    try {
      const response = await ingestKnowledgeSource(sourceId);
      setMessage(
        `Ingestion completed. Chunks created: ${response.data.chunksCount}`,
      );
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion failed.");
      await loadSources();
    } finally {
      setIngestingId(null);
    }
  }

  async function handleDelete(sourceId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this knowledge source?",
    );

    if (!confirmed) return;

    setDeletingId(sourceId);
    setError("");
    setMessage("");

    try {
      await deleteKnowledgeSource(sourceId);
      setMessage("Knowledge source deleted successfully.");
      setSearchResults([]);
      setRagContext("");
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      setError("Search query is required.");
      return;
    }

    setSearchLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await searchKnowledge(searchQuery, 5);
      setSearchResults(response.data.chunks);
      setRagContext(response.data.context);
      setMessage(
        `Search completed. Results found: ${response.data.totalResults}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      clearTokens();
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-800 bg-slate-900/70 p-6 lg:block">
        <div>
          <h2 className="text-xl font-bold">ResolveAI</h2>
          <p className="mt-1 text-sm text-slate-400">
            Agentic support platform
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            Overview
          </Link>

          <Link
            href="/dashboard/knowledge"
            className="block rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
          >
            Knowledge Base
          </Link>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Tickets
          </a>

          <Link
            href="/dashboard/chat"
            className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            AI Chat
          </Link>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Agent Runs
          </a>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Settings
          </a>
        </nav>
      </aside>

      <section className="lg:pl-72">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-5">
          <div>
            <p className="text-sm text-slate-400">Knowledge Base</p>
            <h1 className="text-2xl font-bold">Upload and ingest documents</h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Logout
          </button>
        </header>

        <div className="space-y-6 p-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Add knowledge source</h2>
              <p className="mt-1 text-sm text-slate-400">
                Upload PDF, TXT, Markdown, or DOCX files. After upload, click
                ingest to extract text and create chunks.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            )}

            <form
              onSubmit={handleUpload}
              className="grid gap-5 lg:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  File
                </label>
                <input
                  id="knowledge-file"
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,.docx"
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-medium file:text-slate-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Source name
                </label>
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                  placeholder="Example: Billing Runbook"
                />
              </div>

              <div className="flex items-end">
                <button
                  disabled={uploading}
                  className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">RAG search test</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search ingested chunks before connecting the final AI chat.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-4 lg:flex-row"
            >
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Example: payment successful but subscription not activated"
              />

              <button
                disabled={searchLoading}
                className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Retrieved chunks</h3>

                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-300">
                        {result.source.name}
                      </span>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                        {result.document.title}
                      </span>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                        Score: {result.score.toFixed(4)}
                      </span>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                        Chunk: {result.chunkIndex}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {result.chunkText}
                    </p>
                  </div>
                ))}

                <details className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer font-medium text-slate-200">
                    View RAG context
                  </summary>

                  <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-6 text-slate-300">
                    {ragContext}
                  </pre>
                </details>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Knowledge sources</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Manage uploaded files and ingestion status.
                </p>
              </div>

              <button
                onClick={loadSources}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading sources...</p>
            ) : sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center">
                <p className="font-medium text-slate-200">
                  No knowledge sources yet.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Upload your first runbook, FAQ, or product document.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-225 border-collapse text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Documents</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {sources.map((source) => (
                      <tr key={source.id} className="bg-slate-900/60">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-slate-100">
                              {source.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {source.mimeType || "Unknown MIME type"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                              source.status,
                            )}`}
                          >
                            {source.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {source.type}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatBytes(source.sizeBytes)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {source.documentsCount ?? 0}
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(source.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleIngest(source.id)}
                              disabled={ingestingId === source.id}
                              className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ingestingId === source.id
                                ? "Ingesting..."
                                : source.status === "COMPLETED"
                                  ? "Re-ingest"
                                  : "Ingest"}
                            </button>

                            <button
                              onClick={() => handleDelete(source.id)}
                              disabled={deletingId === source.id}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === source.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
