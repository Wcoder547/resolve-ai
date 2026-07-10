"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { ApiResponse, PendingToolCall } from "@/types/agentic";
import { JsonBlock } from "./JsonBlock";
import { StatusBadge } from "./StatusBadge";

export function AgentToolApprovals() {
  const [toolCalls, setToolCalls] = useState<PendingToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function loadPendingToolCalls() {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<
        ApiResponse<{ toolCalls: PendingToolCall[] }>
      >("/api/chat/agent/tool-calls/pending");

      setToolCalls(response.data.toolCalls);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pending approvals."
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveToolCall(toolCallId: string) {
    setActionLoadingId(toolCallId);
    setError("");

    try {
      await apiRequest(`/api/chat/agent/tool-calls/${toolCallId}/approve`, {
        method: "POST"
      });

      await loadPendingToolCalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function rejectToolCall(toolCallId: string) {
    setActionLoadingId(toolCallId);
    setError("");

    try {
      await apiRequest(`/api/chat/agent/tool-calls/${toolCallId}/reject`, {
        method: "POST",
        body: {
          reason: rejectReason[toolCallId] || "Rejected from approval UI."
        }
      });

      await loadPendingToolCalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setActionLoadingId("");
    }
  }

  useEffect(() => {
    loadPendingToolCalls();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">
            Tool Approvals
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review approval-required agent tool calls before execution.
          </p>
        </div>

        <button
          onClick={loadPendingToolCalls}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading pending tool calls...
        </div>
      ) : null}

      {!loading && toolCalls.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No pending tool approvals.
        </div>
      ) : null}

      <div className="space-y-5">
        {toolCalls.map((toolCall) => (
          <div
            key={toolCall.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {toolCall.toolName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {toolCall.reason || "No reason provided."}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Agent Run:{" "}
                  <a
                    href={`/dashboard/agent/runs/${toolCall.agentRun.id}`}
                    className="font-medium text-slate-950 underline"
                  >
                    {toolCall.agentRun.id}
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge value={toolCall.toolCategory || "UNKNOWN"} />
                <StatusBadge value={toolCall.approvalStatus} />
              </div>
            </div>

            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Original Question
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-800">
                {toolCall.agentRun.question}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Tool Input
                </h3>
                <JsonBlock data={toolCall.input || {}} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Current Output
                </h3>
                <JsonBlock data={toolCall.output || {}} />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Rejection reason
              </label>
              <textarea
                value={rejectReason[toolCall.id || ""] || ""}
                onChange={(event) =>
                  setRejectReason((previous) => ({
                    ...previous,
                    [toolCall.id || ""]: event.target.value
                  }))
                }
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                placeholder="Optional reason if rejecting..."
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => approveToolCall(toolCall.id || "")}
                disabled={actionLoadingId === toolCall.id}
                className="rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionLoadingId === toolCall.id ? "Approving..." : "Approve & Execute"}
              </button>

              <button
                onClick={() => rejectToolCall(toolCall.id || "")}
                disabled={actionLoadingId === toolCall.id}
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionLoadingId === toolCall.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}