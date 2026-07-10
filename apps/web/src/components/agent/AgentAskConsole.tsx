"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { ApiResponse, AskAgentResponse } from "@/types/agentic";
import { JsonBlock } from "./JsonBlock";
import { StatusBadge } from "./StatusBadge";

export function AgentAskConsole() {
  const [question, setQuestion] = useState(
    "Payment is successful but subscription is not activated. Create a support ticket for this issue after approval."
  );
  const [conversationId, setConversationId] = useState("");
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskAgentResponse | null>(null);
  const [error, setError] = useState("");

  async function handleAsk() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await apiRequest<ApiResponse<AskAgentResponse>>(
        "/api/chat/agent/ask",
        {
          method: "POST",
          body: {
            question,
            limit,
            ...(conversationId.trim()
              ? { conversationId: conversationId.trim() }
              : {})
          }
        }
      );

      setResult(response.data);

      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agentic request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-slate-950">
            Agentic Resolution Console
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ask the multi-agent runtime to triage, retrieve, diagnose, use safe
            tools, and generate a support-ready resolution.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Question
            </label>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              placeholder="Ask an agentic support question..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Conversation ID
              </label>
              <input
                value={conversationId}
                onChange={(event) => setConversationId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                placeholder="Optional follow-up conversation ID"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Retrieval limit
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Running agents..." : "Run Agentic Resolution"}
          </button>
        </div>
      </div>

      {result ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StatusBadge value={result.grounded ? "grounded" : "not grounded"} />
              <StatusBadge value={`confidence: ${result.confidence}`} />
              <StatusBadge value={`retrieval: ${result.retrievalMode}`} />
              {result.needsEscalation ? (
                <StatusBadge value="needs escalation" />
              ) : null}
            </div>

            <h2 className="mb-3 text-lg font-semibold text-slate-950">
              Final Answer
            </h2>

            <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800">
              {result.answer}
            </div>
          </div>

          {result.agentRun ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">
                Agent Run
              </h2>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Local Run ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">
                    {result.agentRun.id}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-2">
                    <StatusBadge value={result.agentRun.status} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Agents</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {result.agentRun.agentsUsed.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Tool Calls</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {result.agentRun.toolCalls.length}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <a
                  href={`/dashboard/agent/runs/${result.agentRun.id}`}
                  className="text-sm font-medium text-slate-950 underline"
                >
                  Open full timeline and debug view
                </a>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              Raw Response
            </h2>
            <JsonBlock data={result} />
          </div>
        </div>
      ) : null}
    </div>
  );
}