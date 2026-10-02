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
import { EmptyState } from "../ui/EmptyState";
import {
  askAgenticChatQuestion,
  streamChatQuestion,
  listChatConversations,
  getChatConversation,
  deleteChatConversation,
} from "@/lib/api";
import type { ChatConversationSummary } from "@/types/chat";
import { formatRelativeTime } from "@/lib/format";
import { resolveAutoChatAskMode } from "@/lib/chat-routing";

// The model returns its answer as markdown with a fairly consistent section
// structure (Direct Answer / Recommended Steps / Sources Used / Confidence).
// Confidence is surfaced as a badge from the API field instead of the
// markdown heading, and Sources has its own panel — strip those sections
// before rendering rather than showing the model's raw markdown.
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
  const EMPTY_STEPS = /no specific steps were available/i;

  const kept = sections
    .filter((s) => {
      if (s.heading == null) return true;
      const h = s.heading.toLowerCase();
      if (DROP_HEADINGS.some((d) => h.startsWith(d))) return false;
      if (h.startsWith("recommended steps")) {
        const body = s.body.join("\n").trim();
        if (!body || EMPTY_STEPS.test(body)) return false;
      }
      return true;
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
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="text-sm font-semibold text-foreground/80 mt-3 mb-1 first:mt-0" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-sm text-foreground/80 leading-relaxed mb-2 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-outside ml-4 space-y-1 mb-2 text-sm text-foreground/80" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-outside ml-4 space-y-1 mb-2 text-sm text-foreground/80" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="text-sm text-foreground/80 leading-relaxed" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic text-foreground/80" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="text-brand hover:text-brand underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ node, ...props }) => (
    <code
      className="bg-card border border-border rounded px-1 py-0.5 text-[11px] font-mono text-brand"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground italic mb-2" {...props} />
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
  confidence?: string | null;
  sources?: DisplaySource[];
  model?: string | null;
  provider?: string | null;
  askMode?: "rag" | "agent";
  createdAt?: string;
  error?: boolean;
  streaming?: boolean;
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
      <div className="ml-8 bg-red-400/5 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-700" />
          <span className="text-sm font-medium text-red-700">
            Something went wrong
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{msg.content}</p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-brand hover:text-brand disabled:opacity-40"
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
        <div className="w-6 h-6 rounded-full bg-brand-soft border border-brand/30 flex items-center justify-center shrink-0">
          <Zap className="w-3 h-3 text-brand" />
        </div>
        <span className="text-xs font-semibold text-foreground/80">ResolveAI</span>
        {msg.askMode === "agent" ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            Agent
          </span>
        ) : null}
        {msg.confidence ? (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
              msg.confidence === "high"
                ? "bg-signal-soft text-signal border-signal/20"
                : msg.confidence === "low"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {msg.confidence} confidence
          </span>
        ) : null}
      </div>

      {/* Answer body */}
      <div className="ml-8 space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {cleanedContent}
          </ReactMarkdown>
          {msg.streaming ? (
            <span className="mt-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-brand align-text-bottom" />
          ) : null}
        </div>

        {/* Sources — collapsed by default, opened via the "Sources" action below */}
        {showSources && msg.sources && msg.sources.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sources Used
            </div>
            <div className="space-y-2">
              {msg.sources.map((src) => (
                <div
                  key={src.key}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <FileText className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-foreground/80">
                          {src.sourceName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {src.documentTitle}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Chunk {src.chunkIndex}
                        </span>
                        <span className="font-mono text-[10px] text-signal bg-signal-soft px-1.5 rounded">
                          {src.score.toFixed(2)}
                        </span>
                      </div>
                      {src.chunkText && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
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
                        className="text-muted-foreground hover:text-foreground/80 transition-colors shrink-0"
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
                    <div className="border-t border-border px-3 py-3">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Retrieved context
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                        {src.chunkText}
                      </p>
                      <button
                        onClick={() => onOpenSource(src)}
                        className="flex items-center gap-1.5 text-[10px] text-brand hover:text-brand mt-2 transition-colors"
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

        {!msg.streaming && msg.grounded === false && (
          <div className="bg-red-400/5 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-700" />
              <span className="text-sm font-medium text-red-700">
                No relevant sources found
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              I could not find relevant information in your uploaded knowledge
              base. Consider uploading additional documentation for this
              topic.
            </p>
          </div>
        )}

        {/* Actions */}
        {!msg.streaming && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-signal" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Copy answer"}
          </button>
          {msg.sources && msg.sources.length > 0 && (
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {showSources ? "Hide sources" : `Sources (${msg.sources.length})`}
            </button>
          )}
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors disabled:opacity-40"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator({
  label = "ResolveAI is checking your knowledge base...",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-brand-soft border border-brand/30 flex items-center justify-center">
        <Zap className="w-3 h-3 text-brand" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
        {label}
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
  const [thinkingLabel, setThinkingLabel] = useState(
    "ResolveAI is checking your knowledge base...",
  );
  const [sending, setSending] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [drawerSources, setDrawerSources] = useState<DisplaySource[]>([]);
  const [selectedSource, setSelectedSource] = useState<DisplaySource | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingIdRef = useRef<string | null>(null);
  const streamingContentRef = useRef("");

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
            confidence: m.metadata?.confidence ?? null,
            model: m.metadata?.model ?? null,
            provider: m.metadata?.provider ?? null,
            askMode:
              m.metadata?.mode === "agentic"
                ? "agent"
                : m.metadata?.mode === "rag" || m.metadata?.mode === "chat"
                  ? "rag"
                  : undefined,
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

  const runAsk = async (
    question: string,
    conversationId: string | null,
    options?: {
      onToken?: (text: string) => void;
      onStatus?: (status: string) => void;
    },
  ) => {
    const path = resolveAutoChatAskMode(question);

    if (path === "rag") {
      const data = await streamChatQuestion(question, conversationId, (event) => {
        if (event.type === "status") {
          options?.onStatus?.(event.status);
        }
        if (event.type === "token") {
          options?.onToken?.(event.text);
        }
      });
      const assistantMsg: Message = {
        id: data.messageId ?? `${Date.now()}-a`,
        role: "assistant",
        content: data.answer,
        grounded: data.grounded,
        confidence: data.confidence ?? null,
        model: data.model,
        provider: data.provider,
        askMode: "rag",
        sources:
          data.retrievedChunks && data.retrievedChunks.length > 0
            ? fromRetrievedChunks(data.retrievedChunks)
            : undefined,
      };
      return { assistantMsg, conversationId: data.conversationId };
    }

    const res = await askAgenticChatQuestion(question, conversationId ?? undefined);
    const agentRun = res.data.agentRun;
    const retrievedChunks = res.data.retrievedChunks ?? [];
    const assistantMsg: Message = {
      id: res.data.messageId ?? `${Date.now()}-a`,
      role: "assistant",
      content: res.data.answer,
      grounded: res.data.grounded,
      confidence: res.data.confidence ?? null,
      model: agentRun?.model ?? null,
      provider: agentRun?.provider ?? null,
      askMode: "agent",
      sources:
        retrievedChunks.length > 0
          ? fromRetrievedChunks(retrievedChunks)
          : undefined,
    };
    return { assistantMsg, conversationId: res.data.conversationId };
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || sending) return;

    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setThinking(true);
    const askPath = resolveAutoChatAskMode(question);
    setThinkingLabel(
      askPath === "agent"
        ? "Running multi-agent resolution..."
        : "ResolveAI is checking your knowledge base...",
    );
    streamingIdRef.current = null;
    streamingContentRef.current = "";

    try {
      const { assistantMsg, conversationId } = await runAsk(question, activeConv, {
        onStatus: (status) => {
          setThinkingLabel(
            status === "generating"
              ? "Writing an answer..."
              : "Searching your knowledge base...",
          );
        },
        onToken: (text) => {
          setThinking(false);
          if (!streamingIdRef.current) {
            streamingIdRef.current = `${Date.now()}-a`;
          }
          streamingContentRef.current += text;
          const id = streamingIdRef.current;
          const content = streamingContentRef.current;
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === id);
            if (!existing) {
              return [
                ...prev,
                {
                  id,
                  role: "assistant",
                  content,
                  streaming: true,
                  askMode: "rag",
                },
              ];
            }
            return prev.map((m) => (m.id === id ? { ...m, content } : m));
          });
        },
      });
      const streamingId = streamingIdRef.current;
      setMessages((prev) => {
        if (streamingId) {
          return prev.map((m) =>
            m.id === streamingId ? { ...assistantMsg, id: streamingId } : m,
          );
        }
        return [...prev, assistantMsg];
      });
      streamingIdRef.current = null;
      setActiveConv(conversationId);
      loadConversations();
    } catch (err) {
      const streamingId = streamingIdRef.current;
      streamingIdRef.current = null;
      setMessages((prev) => {
        const errorMsg: Message = {
          id: streamingId ?? `${Date.now()}-e`,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "The request failed. Please try again.",
          error: true,
        };
        if (streamingId) {
          return prev.map((m) => (m.id === streamingId ? errorMsg : m));
        }
        return [...prev, errorMsg];
      });
    } finally {
      setThinking(false);
      setSending(false);
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
    streamingIdRef.current = assistantMsgId;
    streamingContentRef.current = "";
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? { ...m, content: "", streaming: true, error: false }
          : m,
      ),
    );
    try {
      const { assistantMsg, conversationId } = await runAsk(userContent, activeConv, {
        onToken: (text) => {
          streamingContentRef.current += text;
          const content = streamingContentRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content,
                    streaming: true,
                    error: false,
                  }
                : m,
            ),
          );
        },
      });
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
    <div className="flex h-full bg-background overflow-hidden">
      {/* Conversation sidebar */}
      <div className="hidden lg:flex flex-col w-60 xl:w-72 border-r border-border bg-card">
        <div className="p-3 border-b border-border">
          <Button
            size="sm"
            className="w-full bg-brand-soft text-brand hover:bg-brand-soft border border-brand/20 text-xs font-medium"
            onClick={startNewChat}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New chat
          </Button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {convosLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : convosError ? (
            <div className="px-3 py-6 text-center">
              <div className="text-xs text-red-700 mb-2">{convosError}</div>
              <button
                onClick={loadConversations}
                className="text-[10px] text-brand hover:text-brand"
              >
                Retry
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <EmptyState
              compact
              variant="chat"
              title={convSearch ? "No matches" : "No conversations yet"}
              description={convSearch ? undefined : "Start asking — grounded answers appear here."}
            />
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
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group cursor-pointer ${activeConv === conv.id ? "bg-brand-soft border border-brand/20 text-brand" : "hover:bg-muted text-muted-foreground"}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">
                    {conv.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-700 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-5 text-[10px] text-muted-foreground">
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
              <Loader2 className="w-5 h-5 text-brand animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <EmptyState
                variant="chat"
                className="py-4"
                title="Ask your knowledge base."
                description="Simple questions use the knowledge base. Agents run only when you ask for tickets, escalation, or investigation."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePrompt(p)}
                    className="text-left px-4 py-3 bg-card border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-brand/30 transition-all"
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
                    <div className="max-w-lg bg-muted border border-border rounded-xl px-4 py-3">
                      <p className="text-sm text-foreground">{msg.content}</p>
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
              {thinking && <ThinkingIndicator label={thinkingLabel} />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end bg-card border border-border rounded-xl p-2 focus-within:border-brand/50 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your uploaded knowledge base..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none py-1.5 px-2 min-h-9 max-h-32"
                style={{ height: "auto" }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-40 w-8 h-8 p-0 rounded-lg shrink-0"
                size="sm"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Source drawer */}
      {showSourceDrawer && selectedSource && (
        <div className="hidden xl:flex flex-col w-80 border-l border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Retrieved context
            </span>
            <button
              onClick={() => setShowSourceDrawer(false)}
              className="text-muted-foreground hover:text-foreground/80"
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
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedSource.key === src.key ? "border-brand/30 bg-brand/5" : "border-border hover:border-border"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-brand" />
                      <span className="text-xs font-medium text-foreground/80">
                        {src.sourceName}
                      </span>
                      <span className="font-mono text-[10px] text-signal bg-signal-soft px-1.5 rounded ml-auto">
                        {src.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {src.documentTitle} · Chunk {src.chunkIndex}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Full chunk
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
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
                    className="flex items-center gap-1 text-[10px] text-brand hover:text-brand"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === selectedSource.key ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="text-foreground/80">{selectedSource.sourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chunk</span>
                <span className="font-mono text-muted-foreground">
                  {selectedSource.chunkIndex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Match score</span>
                <span className="font-mono text-signal">
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