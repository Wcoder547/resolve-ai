"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  askChatQuestion,
  deleteChatConversation,
  getChatConversation,
  listChatConversations
} from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import type {
  ChatConversationSummary,
  ChatMessage,
  ChatSource
} from "@/types/chat";

function formatModel(provider?: string | null, model?: string | null) {
  if (!provider && !model) return "No model";

  if (provider && model) {
    return `${provider} / ${model}`;
  }

  return provider || model || "No model";
}

export default function ChatPage() {
  const router = useRouter();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [conversations, setConversations] = useState<ChatConversationSummary[]>(
  []
);
const [historyLoading, setHistoryLoading] = useState(false);


async function loadConversations() {
  setHistoryLoading(true);

  try {
    const response = await listChatConversations();
    setConversations(response.data.conversations);
  } catch (err) {
    if (err instanceof Error && err.message.includes("No access token")) {
      clearTokens();
      router.push("/login");
    }
  } finally {
    setHistoryLoading(false);
  }
}

useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void loadConversations();
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, );

function parseSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ChatSource => {
    return (
      typeof item === "object" &&
      item !== null &&
      "sourceName" in item &&
      "documentTitle" in item &&
      "chunkIndex" in item
    );
  });
}

async function openConversation(selectedConversationId: string) {
  setError("");

  try {
    const response = await getChatConversation(selectedConversationId);
    const conversation = response.data.conversation;

    setConversationId(conversation.id);

    setMessages(
      conversation.messages
        .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          sources: parseSources(message.sources),
          grounded: message.metadata?.grounded,
          provider: message.metadata?.provider,
          model: message.metadata?.model,
          createdAt: message.createdAt
        }))
    );
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to load conversation."
    );
  }
}

async function removeConversation(selectedConversationId: string) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this conversation?"
  );

  if (!confirmed) return;

  try {
    await deleteChatConversation(selectedConversationId);

    if (conversationId === selectedConversationId) {
      startNewChat();
    }

    await loadConversations();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to delete conversation."
    );
  }
}

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuestion = question.trim();

    if (!cleanedQuestion) {
      setError("Please enter a question.");
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "USER",
      content: cleanedQuestion,
      createdAt: new Date().toISOString()
    };

    setMessages((previous) => [...previous, userMessage]);
    await loadConversations();
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await askChatQuestion(cleanedQuestion, conversationId, 5);

      setConversationId(response.data.conversationId);

      const assistantMessage: ChatMessage = {
        id: response.data.messageId || crypto.randomUUID(),
        role: "ASSISTANT",
        content: response.data.answer,
        sources: response.data.sources,
        retrievedChunks: response.data.retrievedChunks,
        grounded: response.data.grounded,
        provider: response.data.provider,
        model: response.data.model,
        createdAt: new Date().toISOString()
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (err) {
      if (err instanceof Error && err.message.includes("No access token")) {
        clearTokens();
        router.push("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to ask question.");
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
  setConversationId(null);
  setMessages([]);
  setQuestion("");
  setError("");
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
            className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            Knowledge Base
          </Link>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Tickets
          </a>

          <Link
            href="/dashboard/chat"
            className="block rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
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
        <div className="mt-8 border-t border-slate-800 pt-6">
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-sm font-semibold text-slate-300">Conversations</h3>

    <button
      onClick={loadConversations}
      className="text-xs text-slate-500 hover:text-cyan-300"
    >
      Refresh
    </button>
  </div>

  {historyLoading ? (
    <p className="text-xs text-slate-500">Loading...</p>
  ) : conversations.length === 0 ? (
    <p className="text-xs text-slate-500">No conversations yet.</p>
  ) : (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`group rounded-xl border p-3 ${
            conversation.id === conversationId
              ? "border-cyan-400 bg-cyan-400/10"
              : "border-slate-800 bg-slate-950"
          }`}
        >
          <button
            onClick={() => openConversation(conversation.id)}
            className="block w-full text-left"
          >
            <p className="line-clamp-2 text-sm font-medium text-slate-200">
              {conversation.title}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {conversation.messagesCount} messages
            </p>
          </button>

          <button
            onClick={() => removeConversation(conversation.id)}
            className="mt-2 hidden text-xs text-red-300 hover:text-red-200 group-hover:block"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )}
</div>
      </aside>

      <section className="lg:pl-72">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-5">
          <div>
            <p className="text-sm text-slate-400">AI Chat</p>
            <h1 className="text-2xl font-bold">
              Ask questions from your knowledge base
            </h1>
          </div>

          <button
            onClick={startNewChat}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            New chat
          </button>
        </header>

        <div className="grid min-h-[calc(100vh-82px)] grid-rows-[1fr_auto]">
          <section className="space-y-5 overflow-y-auto p-6">
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="max-w-2xl text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-2xl font-bold text-slate-950">
                    AI
                  </div>

                  <h2 className="text-3xl font-bold">
                    Ask ResolveAI anything
                  </h2>

                  <p className="mt-3 text-slate-400">
                    Ask questions based on your uploaded and ingested documents.
                    The answer will include sources and retrieved chunks.
                  </p>

                  <div className="mt-8 grid gap-3 text-left md:grid-cols-2">
                    <button
                      onClick={() =>
                        setQuestion(
                          "Payment is successful but subscription is not activated. What should support do?"
                        )
                      }
                      className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 transition hover:border-cyan-400"
                    >
                      Payment succeeded but subscription is inactive
                    </button>

                    <button
                      onClick={() =>
                        setQuestion(
                          "What are the common root causes for subscription activation failure?"
                        )
                      }
                      className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 transition hover:border-cyan-400"
                    >
                      Common root causes for activation failure
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-5xl space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "USER" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl rounded-2xl border p-5 ${
                        message.role === "USER"
                          ? "border-cyan-400/40 bg-cyan-400 text-slate-950"
                          : "border-slate-800 bg-slate-900 text-slate-100"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <span
                          className={`text-xs font-semibold ${
                            message.role === "USER"
                              ? "text-slate-800"
                              : "text-cyan-300"
                          }`}
                        >
                          {message.role === "USER" ? "You" : "ResolveAI"}
                        </span>

                        {message.role === "ASSISTANT" && (
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                            {formatModel(message.provider, message.model)}
                          </span>
                        )}
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-7">
                        {message.content}
                      </div>

                      {message.role === "ASSISTANT" && (
                        <div className="mt-5 space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                message.grounded
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-red-400/10 text-red-300"
                              }`}
                            >
                              {message.grounded ? "Grounded" : "Not grounded"}
                            </span>

                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                              Sources: {message.sources?.length || 0}
                            </span>
                          </div>

                          {message.sources && message.sources.length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-semibold text-slate-200">
                                Sources used
                              </h4>

                              <div className="space-y-2">
                                {message.sources.map((source) => (
                                  <div
                                    key={`${source.sourceId}-${source.chunkId}`}
                                    className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                                  >
                                    <p className="text-sm font-medium text-slate-200">
                                      {source.sourceName}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {source.documentTitle} · Chunk{" "}
                                      {source.chunkIndex} · Score{" "}
                                      {source.score.toFixed(4)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.retrievedChunks &&
                            message.retrievedChunks.length > 0 && (
                              <details className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                <summary className="cursor-pointer text-sm font-medium text-slate-200">
                                  View retrieved chunks
                                </summary>

                                <div className="mt-4 space-y-3">
                                  {message.retrievedChunks.map((chunk) => (
                                    <div
                                      key={chunk.id}
                                      className="rounded-lg bg-slate-900 p-4"
                                    >
                                      <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-400">
                                        <span>{chunk.source.name}</span>
                                        <span>·</span>
                                        <span>Chunk {chunk.chunkIndex}</span>
                                        <span>·</span>
                                        <span>
                                          Score {chunk.score.toFixed(4)}
                                        </span>
                                      </div>

                                      <p className="whitespace-pre-wrap text-xs leading-6 text-slate-300">
                                        {chunk.chunkText}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
                      ResolveAI is thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="border-t border-slate-800 bg-slate-900/70 p-5">
            <form
              onSubmit={handleAsk}
              className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row"
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder="Ask about your uploaded knowledge base..."
                className="min-h-14 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              />

              <button
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Asking..." : "Ask"}
              </button>
            </form>

            <p className="mx-auto mt-3 max-w-5xl text-xs text-slate-500">
              ResolveAI answers only from retrieved knowledge base context.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}