"use client";

import { useState, useRef, useEffect } from "react";
import {
  Zap, MessageSquare, Search, Plus, Trash2, ChevronRight,
  Copy, ThumbsUp, ThumbsDown, RefreshCw, FileText,
  X, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Send, Loader2, BookOpen, Clock
} from "lucide-react";
import { Button } from "../ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  sources?: Source[];
  model?: string;
  responseTime?: string;
  thinking?: boolean;
}

interface Source {
  name: string;
  doc: string;
  chunk: string;
  score: number;
  preview: string;
}

const conversations = [
  { id: "c1", title: "Subscription activation failure", messages: 4, time: "2m ago", active: true },
  { id: "c2", title: "Webhook delivery delays", messages: 6, time: "1h ago" },
  { id: "c3", title: "API authentication errors", messages: 3, time: "3h ago" },
  { id: "c4", title: "Team member invite flow", messages: 8, time: "Yesterday" },
  { id: "c5", title: "Duplicate billing charge", messages: 2, time: "2d ago" },
];

const suggestedPrompts = [
  "Why is a paid subscription still inactive?",
  "How do I reset an organization API key?",
  "What steps should support follow for webhook delays?",
  "When should a ticket be escalated?",
];

const sampleSources: Source[] = [
  { name: "Billing Runbook", doc: "Subscription Activation Guide", chunk: "Chunk 04", score: 0.94, preview: "Subscription activation is triggered by the subscription.activated webhook event. If this event fails to deliver within 30 seconds, the system retries up to 3 times..." },
  { name: "Support KB", doc: "Payment Troubleshooting", chunk: "Chunk 11", score: 0.87, preview: "When a charge succeeds but the subscription remains inactive, the most common cause is a failed webhook delivery. Check the Stripe webhook dashboard for delivery attempts..." },
  { name: "Incident Playbooks", doc: "Billing Incident Response", chunk: "Chunk 02", score: 0.81, preview: "For billing-related incidents where payments succeed but subscriptions are not activated, follow these escalation steps before contacting Stripe support..." },
];

function AssistantMessage({ msg, onCopySource }: { msg: Message; onCopySource: (src: Source) => void }) {
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      {/* Response header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
          <Zap className="w-3 h-3 text-cyan-400" />
        </div>
        <span className="text-xs font-semibold text-slate-300">ResolveAI</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1
          ${msg.grounded ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-red-400/10 text-red-400 border-red-400/20"}`}>
          {msg.grounded ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
          {msg.grounded ? "Grounded" : "Not grounded"}
        </span>
        {msg.model && <span className="text-[10px] font-mono text-slate-600">{msg.model}</span>}
        {msg.responseTime && <span className="text-[10px] text-slate-600">{msg.responseTime}</span>}
        {msg.sources && <span className="text-[10px] text-slate-600">{msg.sources.length} sources</span>}
      </div>

      {/* Answer body */}
      <div className="ml-8 space-y-4">
        {/* Direct answer */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 space-y-4">
          <div>
            <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Direct Answer</div>
            <p className="text-sm text-slate-300 leading-relaxed">{msg.content}</p>
          </div>

          {msg.grounded && (
            <div>
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">Recommended Steps</div>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-5 flex-shrink-0">1.</span><span>Check webhook delivery logs in the Stripe dashboard for failed <code className="font-mono text-[11px] text-slate-200 bg-[#1E293B] px-1 rounded">subscription.activated</code> events</span></li>
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-5 flex-shrink-0">2.</span><span>Verify the subscription_id is correctly associated with the charge in your database</span></li>
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-5 flex-shrink-0">3.</span><span>If webhook delivery failed, manually trigger subscription activation via the admin API</span></li>
                <li className="flex gap-2"><span className="text-cyan-400 font-mono text-xs w-5 flex-shrink-0">4.</span><span>Document the incident and check for similar cases in the last 24 hours</span></li>
              </ol>
            </div>
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources Used</div>
            <div className="space-y-2">
              {msg.sources.map((src, i) => (
                <div key={i} className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 p-3">
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-slate-300">{src.name}</span>
                        <span className="text-[10px] text-slate-500">{src.doc}</span>
                        <span className="font-mono text-[10px] text-slate-600">{src.chunk}</span>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 rounded">{src.score}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{src.preview}</p>
                    </div>
                    <button
                      onClick={() => setExpandedSrc(expandedSrc === src.name ? null : src.name)}
                      className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                    >
                      {expandedSrc === src.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {expandedSrc === src.name && (
                    <div className="border-t border-[#1E293B] px-3 py-3">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Retrieved context</div>
                      <p className="text-xs text-slate-400 leading-relaxed font-mono">{src.preview}</p>
                      <button
                        onClick={() => onCopySource(src)}
                        className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copy chunk
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
              <span className="text-sm font-medium text-red-400">No relevant sources found</span>
            </div>
            <p className="text-xs text-slate-500">I could not find relevant information in your uploaded knowledge base. Consider uploading additional documentation for this topic.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy answer"}
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" /> Helpful
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
            <ThumbsDown className="w-3.5 h-3.5" /> Not helpful
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

export function ChatPage() {
  const [activeConv, setActiveConv] = useState("c1");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [selectedChunkSrc, setSelectedChunkSrc] = useState<Source | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = () => {
    if (!input.trim() || thinking) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const grounded = !input.toLowerCase().includes("custom");
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: grounded
          ? "A successful charge does not automatically activate a subscription. Activation is triggered by the subscription.activated webhook event. If the webhook delivery fails or the handler throws an error, the subscription remains in a pending state despite the payment succeeding."
          : "I could not find relevant information about this topic in your uploaded knowledge base.",
        grounded,
        sources: grounded ? sampleSources : [],
        model: "GPT-4o",
        responseTime: "1.2s",
      };
      setThinking(false);
      setMessages(prev => [...prev, aiMsg]);
    }, 2000);
  };

  const handlePrompt = (p: string) => {
    setInput(p);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden">
      {/* Conversation sidebar */}
      <div className="hidden lg:flex flex-col w-60 xl:w-72 border-r border-[#1E293B] bg-[#0F172A]">
        <div className="p-3 border-b border-[#1E293B]">
          <Button
            size="sm"
            className="w-full bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20 text-xs font-medium"
            onClick={() => setMessages([])}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New chat
          </Button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              placeholder="Search conversations..."
              className="w-full bg-[#0B1220] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-[#334155] transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${activeConv === conv.id ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-400" : "hover:bg-[#1E293B] text-slate-400"}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{conv.title}</span>
                <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 ml-5 text-[10px] text-slate-600">
                <Clock className="w-2.5 h-2.5" />
                {conv.time} · {conv.messages} msgs
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mb-5">
                <Zap className="w-7 h-7 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">Ask your knowledge base.</h2>
              <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
                ResolveAI searches your uploaded sources and shows exactly what it used to generate every answer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedPrompts.map(p => (
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
              {messages.map(msg => (
                <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                  {msg.role === "user" ? (
                    <div className="max-w-lg bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3">
                      <p className="text-sm text-slate-200">{msg.content}</p>
                    </div>
                  ) : (
                    <AssistantMessage msg={msg} onCopySource={(src) => { setSelectedChunkSrc(src); setShowSourceDrawer(true); }} />
                  )}
                </div>
              ))}
              {thinking && (
                <ThinkingIndicator />
              )}
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your uploaded knowledge base..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none py-1.5 px-2 min-h-[36px] max-h-32"
                style={{ height: "auto" }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || thinking}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:opacity-40 w-8 h-8 p-0 rounded-lg flex-shrink-0"
                size="sm"
              >
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2 px-1">
              <span className="text-[10px] text-slate-600">GPT-4o via OpenRouter</span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-600">All sources</span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-600">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source drawer */}
      {showSourceDrawer && selectedChunkSrc && (
        <div className="hidden xl:flex flex-col w-80 border-l border-[#1E293B] bg-[#0F172A]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
            <span className="text-sm font-semibold text-slate-200">Retrieved context</span>
            <button onClick={() => setShowSourceDrawer(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              {sampleSources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChunkSrc(src)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedChunkSrc.name === src.name ? "border-cyan-400/30 bg-cyan-400/5" : "border-[#1E293B] hover:border-[#334155]"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-300">{src.name}</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 rounded ml-auto">{src.score}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-1">{src.doc} · {src.chunk}</div>
                </button>
              ))}
            </div>

            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Full chunk</div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">{selectedChunkSrc.preview}</p>
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300">
                  <BookOpen className="w-3 h-3" /> Open source
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-slate-300">{selectedChunkSrc.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chunk</span>
                <span className="font-mono text-slate-400">{selectedChunkSrc.chunk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Match score</span>
                <span className="font-mono text-emerald-400">{selectedChunkSrc.score}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
