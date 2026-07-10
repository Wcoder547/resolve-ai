"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type {
  AgentRunDetail,
  AgentTimelineEvent,
  ApiResponse
} from "@/types/agentic";
import { JsonBlock } from "./JsonBlock";
import { StatusBadge } from "./StatusBadge";

type AgentRunDetailViewProps = {
  agentRunId: string;
};

export function AgentRunDetailView({ agentRunId }: AgentRunDetailViewProps) {
  const [detail, setDetail] = useState<AgentRunDetail | null>(null);
  const [timeline, setTimeline] = useState<AgentTimelineEvent[]>([]);
  const [debug, setDebug] = useState<unknown | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "agents" | "tools" | "citations" | "debug"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [debugLoading, setDebugLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugError, setDebugError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [detailResponse, timelineResponse] = await Promise.all([
        apiRequest<ApiResponse<{ agentRun: AgentRunDetail }>>(
          `/api/chat/agent/runs/${agentRunId}`
        ),
        apiRequest<
          ApiResponse<{
            agentRunId: string;
            status: string;
            durationMs: number | null;
            events: AgentTimelineEvent[];
          }>
        >(`/api/chat/agent/runs/${agentRunId}/timeline`)
      ]);

      setDetail(detailResponse.data.agentRun);
      setTimeline(timelineResponse.data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent run.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDebug() {
    setDebugLoading(true);
    setDebugError("");

    try {
      const response = await apiRequest<ApiResponse<unknown>>(
        `/api/chat/agent/runs/${agentRunId}/debug`
      );

      setDebug(response.data);
    } catch (err) {
      setDebugError(
        err instanceof Error
          ? err.message
          : "You may not have permission to view debug data."
      );
    } finally {
      setDebugLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentRunId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Loading agent run...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error || "Agent run not found."}
      </div>
    );
  }

  const tabs = [
    "overview",
    "timeline",
    "agents",
    "tools",
    "citations",
    "debug"
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Agent Run Detail
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {detail.question}
            </p>
          </div>

          <StatusBadge value={detail.status} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {detail.confidence || "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Grounded</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {detail.grounded ? "Yes" : "No"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Steps</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {detail.steps?.length || 0}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Tool Calls</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {detail.toolCalls?.length || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);

                if (tab === "debug" && !debug) {
                  loadDebug();
                }
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-950">
              Final Answer
            </h2>
            <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800">
              {detail.answer || "No answer stored."}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-950">
              Summary
            </h2>
            <JsonBlock
              data={{
                id: detail.id,
                externalRunId: detail.externalRunId,
                status: detail.status,
                standaloneQuestion: detail.standaloneQuestion,
                needsEscalation: detail.needsEscalation,
                escalationReason: detail.escalationReason,
                provider: detail.provider,
                model: detail.model,
                promptVersion: detail.promptVersion
              }}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-950">
            Execution Timeline
          </h2>

          <div className="space-y-4">
            {timeline.map((event, index) => (
              <div key={`${event.type}-${index}`} className="flex gap-4">
                <div className="mt-1 h-3 w-3 rounded-full bg-slate-950" />
                <div className="flex-1 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">
                        {event.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge value={event.status} />
                  </div>

                  <div className="mt-3">
                    <JsonBlock data={event.data} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "agents" ? (
        <div className="space-y-4">
          {detail.steps.map((step, index) => (
            <div
              key={step.id || `${step.agentName}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {step.agentName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {step.provider || "-"} / {step.model || "-"} /{" "}
                    {step.latencyMs ?? 0}ms
                  </p>
                </div>
                <StatusBadge value={step.status} />
              </div>

              <JsonBlock
                data={{
                  input: step.input,
                  output: step.output,
                  error: step.error
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "tools" ? (
        <div className="space-y-4">
          {detail.toolCalls.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No tool calls for this run.
            </div>
          ) : (
            detail.toolCalls.map((toolCall) => (
              <div
                key={toolCall.id || toolCall.toolCallId || toolCall.toolName}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {toolCall.toolName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {toolCall.toolCategory || "-"} / approval:{" "}
                      {toolCall.approvalStatus}
                    </p>
                  </div>
                  <StatusBadge value={toolCall.status} />
                </div>

                <JsonBlock data={toolCall} />
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "citations" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Citations
          </h2>
          <JsonBlock data={detail.citations || []} />
        </div>
      ) : null}

      {activeTab === "debug" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Debug Payload
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Only owner/admin/developer roles should access this.
              </p>
            </div>

            <button
              onClick={loadDebug}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
          </div>

          {debugLoading ? (
            <p className="text-sm text-slate-500">Loading debug payload...</p>
          ) : null}

          {debugError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {debugError}
            </div>
          ) : null}

          {debug ? <JsonBlock data={debug} /> : null}
        </div>
      ) : null}
    </div>
  );
}