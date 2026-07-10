import client from "prom-client";
import { prisma } from "./prisma.js";

const agentRunsTotalGauge = new client.Gauge({
  name: "resolveai_api_agent_runs_total",
  help: "Total number of agent runs by status.",
  labelNames: ["status"]
});

const failedAgentRunsGauge = new client.Gauge({
  name: "resolveai_api_agent_runs_failed_total",
  help: "Total number of failed agent runs."
});

const pendingToolCallsGauge = new client.Gauge({
  name: "resolveai_api_agent_tool_calls_pending_total",
  help: "Total number of agent tool calls pending human approval."
});

const integrationFailuresGauge = new client.Gauge({
  name: "resolveai_api_integration_failures_total",
  help: "Total number of failed integration executions."
});

const dailyAiUsageTokensGauge = new client.Gauge({
  name: "resolveai_api_ai_usage_daily_tokens_total",
  help: "Total AI tokens used today across organizations."
});

const knowledgeSourcesGauge = new client.Gauge({
  name: "resolveai_api_knowledge_sources_total",
  help: "Total number of knowledge sources by status.",
  labelNames: ["status"]
});

let lastUpdatedAt = 0;
const CACHE_MS = 10_000;

export async function updateOperationalMetrics() {
  const now = Date.now();

  if (now - lastUpdatedAt < CACHE_MS) {
    return;
  }

  lastUpdatedAt = now;

  const today = new Date();
  const startOfUtcDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const [
    agentRunsByStatus,
    failedAgentRuns,
    pendingToolCalls,
    integrationFailures,
    dailyAiUsage,
    knowledgeSourcesByStatus
  ] = await Promise.all([
    prisma.agentRun.groupBy({
      by: ["status"],
      _count: {
        id: true
      }
    }),

    prisma.agentRun.count({
      where: {
        status: "FAILED"
      }
    }),

    prisma.agentToolCall.count({
      where: {
        requiresApproval: true,
        approvalStatus: "PENDING"
      }
    }),

    prisma.integrationExecutionLog.count({
      where: {
        status: "failed"
      }
    }),

    prisma.organizationAiUsageDaily.aggregate({
      where: {
        date: startOfUtcDay
      },
      _sum: {
        totalTokens: true
      }
    }),

    prisma.knowledgeSource.groupBy({
      by: ["status"],
      _count: {
        id: true
      }
    })
  ]);

  agentRunsTotalGauge.reset();

  for (const item of agentRunsByStatus) {
    agentRunsTotalGauge.set(
      {
        status: item.status
      },
      item._count.id
    );
  }

  failedAgentRunsGauge.set(failedAgentRuns);
  pendingToolCallsGauge.set(pendingToolCalls);
  integrationFailuresGauge.set(integrationFailures);
  dailyAiUsageTokensGauge.set(dailyAiUsage._sum.totalTokens || 0);

  knowledgeSourcesGauge.reset();

  for (const item of knowledgeSourcesByStatus) {
    knowledgeSourcesGauge.set(
      {
        status: item.status
      },
      item._count.id
    );
  }
}