"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { AgentRunLite, ApiResponse } from "@/types/agentic";
import { StatusBadge } from "./StatusBadge";

type Summary = {
  totals: {
    totalRuns: number;
    runningRuns: number;
    completedRuns: number;
    guardrailRuns: number;
    failedRuns: number;
  };
  toolCalls: {
    pendingApproval: number;
    executed: number;
    rejected: number;
  };
  last24Hours: {
    totalRuns: number;
    groundedRuns: number;
    escalationRuns: number;
    averageDurationMs: number | null;
  };
};

export function AgentRunsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<AgentRunLite[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(selectedStatus = status) {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, runsResponse] = await Promise.all([
        apiRequest<ApiResponse<Summary>>("/api/chat/agent/runs/summary"),
        apiRequest<ApiResponse<{ runs: AgentRunLite[] }>>(
          `/api/chat/agent/runs?limit=50${
            selectedStatus ? `&status=${selectedStatus}` : ""
          }`
        )
      ]);

      setSummary(summaryResponse.data);
      setRuns(runsResponse.data.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent runs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDuration(ms?: number | null) {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">
          Agent Runs
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor multi-agent executions, tool calls, guardrails, and run status.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Runs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {summary.totals.totalRuns}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Failed Runs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {summary.totals.failedRuns}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending Approvals</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {summary.toolCalls.pendingApproval}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Avg Duration 24h</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {formatDuration(summary.last24Hours.averageDurationMs)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                loadData(event.target.value);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="RUNNING">RUNNING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="COMPLETED_WITH_GUARDRAIL_WARNING">
                COMPLETED_WITH_GUARDRAIL_WARNING
              </option>
              <option value="FAILED">FAILED</option>
            </select>

            <button
              onClick={() => loadData()}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              Refresh
            </button>
          </div>

          <a
            href="/dashboard/agent/approvals"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Pending Approvals
          </a>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading agent runs...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">Question</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-3 py-3">Grounded</th>
                  <th className="px-3 py-3">Steps</th>
                  <th className="px-3 py-3">Tools</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100">
                    <td className="max-w-[360px] px-3 py-4">
                      <p className="line-clamp-2 font-medium text-slate-900">
                        {run.question}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge value={run.status} />
                    </td>
                    <td className="px-3 py-4">{run.confidence || "-"}</td>
                    <td className="px-3 py-4">
                      {run.grounded ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-4">{run._count?.steps ?? 0}</td>
                    <td className="px-3 py-4">{run._count?.toolCalls ?? 0}</td>
                    <td className="px-3 py-4">{formatDuration(run.durationMs)}</td>
                    <td className="px-3 py-4">
                      <a
                        href={`/dashboard/agent/runs/${run.id}`}
                        className="font-medium text-slate-950 underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {runs.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No agent runs found.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}