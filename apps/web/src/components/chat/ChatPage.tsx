"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Zap,
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  BookOpen,
  Clock,
  Link2,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "../ui/button";
import {
  askAgenticChatQuestion,
  listChatConversations,
  getChatConversation,
  deleteChatConversation,
} from "@/lib/api";
import type { ChatConversationSummary } from "@/types/chat";
import { formatRelativeTime } from "@/lib/format";

// The model returns its answer as markdown with a fairly consistent section
// structure (Direct Answer / Recommended Steps / Sources Used / Confidence).
// The UI already has its own sources panel and doesn't want a "Direct
// Answer" label or a confidence readout, so this strips/unwraps those
// sections before rendering rather than showing the model's raw markdown.
function cleanAnswerMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const sections: { heading: string | null; body: string[] }[] = [
    { heading: null, body: [] },
  ];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.*)$/);
    if (headingMatch) {
      sections.push({ heading: headingMatch[1].trim(), body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  const DROP_HEADINGS = ["confidence", "sources used", "sources"];
  const UNWRAP_HEADINGS = ["direct answer", "answer"];

  const kept = sections
    .filter((s) => {
      if (s.heading == null) return true;
      const h = s.heading.toLowerCase();
      return !DROP_HEADINGS.some((d) => h.startsWith(d));
    })
    .map((s) => {
      if (s.heading == null) return s.body.join("\n");
      const h = s.heading.toLowerCase();
      if (UNWRAP_HEADINGS.some((u) => h === u)) {
        return s.body.join("\n");
      }
      return `## ${s.heading}\n${s.body.join("\n")}`;
    });

  return kept.join("\n").trim();
}

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="text-sm font-semibold text-slate-300 mt-3 mb-1 first:mt-0" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-sm text-slate-300 leading-relaxed mb-2 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-outside ml-4 space-y-1 mb-2 text-sm text-slate-300" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-outside ml-4 space-y-1 mb-2 text-sm text-slate-300" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="text-sm text-slate-300 leading-relaxed" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-slate-100" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic text-slate-300" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ node, ...props }) => (
    <code
      className="bg-[#0B1220] border border-[#1E293B] rounded px-1 py-0.5 text-[11px] font-mono text-cyan-300"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-[#334155] pl-3 text-sm text-slate-400 italic mb-2" {...props} />
  ),
};

// ---- Local display types --------------------------------------------------
// Loaded (historical) messages only carry `ChatSource` (citation metadata,
// no chunk text). Fresh answers from /api/chat/ask also return
// `retrievedChunks`, which include the actual chunk text. We normalize both
// into one shape and just treat `chunkText` as optional.

interface DisplaySource {
  key: string;
  sourceName: string;
  documentTitle: string;
  chunkIndex: number;
  score: number;
  chunkText?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  sources?: DisplaySource[];
  model?: string | null;
  provider?: string | null;
  createdAt?: string;
  error?: boolean;
}

const suggestedPrompts = [
  "Why is a paid subscription still inactive?",
  "How do I reset an organization API key?",
  "What steps should support follow for webhook delays?",
  "When should a ticket be escalated?",
];

function AssistantMessage({
  msg,
  onRegenerate,
  onOpenSource,
  regenerating,
}: {
  msg: Message;
  onRegenerate: () => void;
  onOpenSource: (src: DisplaySource) => void;
  regenerating: boolean;
}) {
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const cleanedContent = cleanAnswerMarkdown(msg.content);

  const handleCopy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (msg.error) {
    return (
      <div className="ml-8 bg-red-400/5 border border-red-400/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            Something went wrong
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{msg.content}</p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
        >
          {regenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Response header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <Zap className="w-3 h-3 text-cyan-400" />
        </div>
        <span className="text-xs font-semibold text-slate-300">ResolveAI</span>
      </div>

      {/* Answer body */}
      <div className="ml-8 space-y-4">
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {cleanedContent}
          </ReactMarkdown>
        </div>

        {/* Sources — collapsed by default, opened via the "Sources" action below */}
        {showSources && msg.sources && msg.sources.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Sources Used
            </div>
            <div className="space-y-2">
              {msg.sources.map((src) => (
                <div
                  key={src.key}
                  className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-slate-300">
                          {src.sourceName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {src.documentTitle}
                        </span>
                        <span className="font-mono text-[10px] text-slate-600">
                          Chunk {src.chunkIndex}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 rounded">
                          {src.score.toFixed(2)}
                        </span>
                      </div>
                      {src.chunkText && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {src.chunkText}
                        </p>
                      )}
                    </div>
                    {src.chunkText && (
                      <button
                        onClick={() =>
                          setExpandedSrc(
                            expandedSrc === src.key ? null : src.key,
                          )
                        }
                        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                      >
                        {expandedSrc === src.key ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {expandedSrc === src.key && src.chunkText && (
                    <div className="border-t border-[#1E293B] px-3 py-3">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Retrieved context
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-mono">
                        {src.chunkText}
                      </p>
                      <button
                        onClick={() => onOpenSource(src)}
                        className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" /> Open in source panel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!msg.grounded && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">
                No relevant sources found
              </span>
            </div>
            <p className="text-xs text-slate-500">
              I could not find relevant information in your uploaded knowledge
              base. Consider uploading additional documentation for this
              topic.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Copy answer"}
          </button>
          {msg.sources && msg.sources.length > 0 && (
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {showSources ? "Hide sources" : `Sources (${msg.sources.length})`}
            </button>
          )}
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
        <Zap className="w-3 h-3 text-cyan-400" />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        ResolveAI is checking your knowledge base...
      </div>
    </div>
  );
}

// Normalizers -----------------------------------------------------------

function fromRetrievedChunks(
  chunks: {
    id: string;
    chunkIndex: number;
    chunkText: string;
    score: number;
    source: { name: string };
    document: { title: string };
  }[],
): DisplaySource[] {
  return chunks.map((c) => ({
    key: c.id,
    sourceName: c.source.name,
    documentTitle: c.document.title,
    chunkIndex: c.chunkIndex,
    score: c.score,
    chunkText: c.chunkText,
  }));
}

function fromChatSources(
  sources: {
    chunkId: string;
    sourceName: string;
    documentTitle: string;
    chunkIndex: number;
    score: number;
  }[],
): DisplaySource[] {
  return sources.map((s) => ({
    key: s.chunkId,
    sourceName: s.sourceName,
    documentTitle: s.documentTitle,
    chunkIndex: s.chunkIndex,
    score: s.score,
  }));
}

export function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [convosError, setConvosError] = useState("");
  const [convSearch, setConvSearch] = useState("");

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [drawerSources, setDrawerSources] = useState<DisplaySource[]>([]);
  const [selectedSource, setSelectedSource] = useState<DisplaySource | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setConvosLoading(true);
    setConvosError("");
    try {
      const res = await listChatConversations();
      setConversations(res.data.conversations);
    } catch {
      setConvosError("Couldn't load conversations.");
    } finally {
      setConvosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const openConversation = async (id: string) => {
    setActiveConv(id);
    setMessagesLoading(true);
    try {
      const res = await getChatConversation(id);
      setMessages(
        res.data.conversation.messages
          .filter((m) => m.role !== "SYSTEM")
          .map((m) => ({
            id: m.id,
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
            grounded: m.metadata?.grounded,
            model: m.metadata?.model ?? null,
            provider: m.metadata?.provider ?? null,
            sources: m.sources && m.sources.length > 0 ? fromChatSources(m.sources) : undefined,
            createdAt: m.createdAt,
          })),
      );
    } catch {
      setMessages([
        {
          id: "load-error",
          role: "assistant",
          content: "Couldn't load this conversation. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveConv(null);
    setMessages([]);
    setInput("");
  };

  const runAsk = async (question: string, conversationId: string | null) => {
    // Uses the agentic endpoint (not the plain /chat/ask) so this actually
    // creates an AgentRun record — otherwise the Agent Runs and Approvals
    // pages never see any data from chat activity.
    const res = await askAgenticChatQuestion(question, conversationId ?? undefined);
    const assistantMsg: Message = {
      id: res.data.messageId ?? `${Date.now()}-a`,
      role: "assistant",
      content: res.data.answer,
      grounded: res.data.grounded,
      model: res.data.agentRun.model,
      provider: res.data.agentRun.provider,
      sources:
        res.data.retrievedChunks.length > 0
          ? fromRetrievedChunks(res.data.retrievedChunks)
          : undefined,
    };
    return { assistantMsg, conversationId: res.data.conversationId };
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || thinking) return;

    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const { assistantMsg, conversationId } = await runAsk(question, activeConv);
      setMessages((prev) => [...prev, assistantMsg]);
      setActiveConv(conversationId);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "The request failed. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const regenerate = async (assistantMsgId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantMsgId);
    if (idx === -1) return;
    // Find the most recent user message before this assistant reply.
    let userContent: string | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userContent = messages[i].content;
        break;
      }
    }
    if (!userContent) return;

    setRegeneratingId(assistantMsgId);
    try {
      const { assistantMsg, conversationId } = await runAsk(userContent, activeConv);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...assistantMsg, id: assistantMsgId } : m)),
      );
      setActiveConv(conversationId);
      loadConversations();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                id: assistantMsgId,
                role: "assistant",
                content:
                  err instanceof Error
                    ? err.message
                    : "The request failed. Please try again.",
                error: true,
              }
            : m,
        ),
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await deleteChatConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConv === id) {
        setActiveConv(null);
        setMessages([]);
      }
    } catch {
      // Non-fatal — leave the item in place if the delete failed.
    }
  };

  const handlePrompt = (p: string) => setInput(p);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openSourceDrawer = (src: DisplaySource, allSources?: DisplaySource[]) => {
    setDrawerSources(allSources ?? [src]);
    setSelectedSource(src);
    setShowSourceDrawer(true);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(convSearch.toLowerCase()),
  );

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Conversation sidebar */}
      <div className="hidden lg:flex flex-col w-60 xl:w-72 border-r border-[#1E293B] bg-[#0F172A]">
        <div className="p-3 border-b border-[#1E293B]">
          <Button
            size="sm"
            className="w-full bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20 text-xs font-medium"
            onClick={startNewChat}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New chat
          </Button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-[#0B1220] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-[#334155] transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {convosLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : convosError ? (
            <div className="px-3 py-6 text-center">
              <div className="text-xs text-red-400 mb-2">{convosError}</div>
              <button
                onClick={loadConversations}
                className="text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                Retry
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-600">
              {convSearch ? "No matching conversations." : "No conversations yet."}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => openConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openConversation(conv.id);
                  }
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group cursor-pointer ${activeConv === conv.id ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-400" : "hover:bg-[#1E293B] text-slate-400"}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">
                    {conv.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-5 text-[10px] text-slate-600">
                  <Clock className="w-2.5 h-2.5" />
                  {formatRelativeTime(conv.updatedAt)} · {conv.messagesCount} msgs
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mb-5">
                <Zap className="w-7 h-7 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">
                Ask your knowledge base.
              </h2>
              <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
                ResolveAI searches your uploaded sources and shows exactly what
                it used to generate every answer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePrompt(p)}
                    className="text-left px-4 py-3 bg-[#0F172A] border border-[#1E293B] rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:border-[#334155] transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "user" ? "flex justify-end" : ""}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-lg bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3">
                      <p className="text-sm text-slate-200">{msg.content}</p>
                    </div>
                  ) : (
                    <AssistantMessage
                      msg={msg}
                      regenerating={regeneratingId === msg.id}
                      onRegenerate={() => regenerate(msg.id)}
                      onOpenSource={(src) => openSourceDrawer(src, msg.sources)}
                    />
                  )}
                </div>
              ))}
              {thinking && <ThinkingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[#1E293B] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end bg-[#0F172A] border border-[#334155] rounded-xl p-2 focus-within:border-cyan-400/50 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your uploaded knowledge base..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none py-1.5 px-2 min-h-9 max-h-32"
                style={{ height: "auto" }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || thinking}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:opacity-40 w-8 h-8 p-0 rounded-lg shrink-0"
                size="sm"
              >
                {thinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2 px-1">
              <span className="text-[10px] text-slate-600">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Source drawer */}
      {showSourceDrawer && selectedSource && (
        <div className="hidden xl:flex flex-col w-80 border-l border-[#1E293B] bg-[#0F172A]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
            <span className="text-sm font-semibold text-slate-200">
              Retrieved context
            </span>
            <button
              onClick={() => setShowSourceDrawer(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {drawerSources.length > 1 && (
              <div className="space-y-2">
                {drawerSources.map((src) => (
                  <button
                    key={src.key}
                    onClick={() => setSelectedSource(src)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedSource.key === src.key ? "border-cyan-400/30 bg-cyan-400/5" : "border-[#1E293B] hover:border-[#334155]"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-medium text-slate-300">
                        {src.sourceName}
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 rounded ml-auto">
                        {src.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1">
                      {src.documentTitle} · Chunk {src.chunkIndex}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Full chunk
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                {selectedSource.chunkText ?? "No chunk text available for this source."}
              </p>
              {selectedSource.chunkText && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedSource.chunkText ?? "").catch(() => {});
                      setCopiedKey(selectedSource.key);
                      setTimeout(() => setCopiedKey(null), 1500);
                    }}
                    className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === selectedSource.key ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-slate-300">{selectedSource.sourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chunk</span>
                <span className="font-mono text-slate-400">
                  {selectedSource.chunkIndex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Match score</span>
                <span className="font-mono text-emerald-400">
                  {selectedSource.score.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}