import {
  AgentRunStatus,
  AgentToolApprovalStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ListAgentRunsQuery } from "./chat.agent-observability.validation.js";

import { env } from "../../config/env.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "apiKey",
  "secret",
  "clientSecret",
  "privateKey",
  "DATABASE_URL",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "GOOGLE_API_KEY"
]);

function createNotFoundError(message: string) {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}

function createForbiddenError(message: string) {
  const error = new Error(message);
  error.name = "ForbiddenError";
  return error;
}

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw createNotFoundError("No organization found for this user.");
  }

  return membership;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const redacted: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes("secret")) {
        redacted[key] = "[REDACTED]";
        continue;
      }

      if (key.toLowerCase().includes("token")) {
        redacted[key] = "[REDACTED]";
        continue;
      }

      redacted[key] = redactValue(nestedValue);
    }

    return redacted;
  }

  return value;
}

function buildAgentRunWhere(input: {
  organizationId: string;
  query: ListAgentRunsQuery;
}): Prisma.AgentRunWhereInput {
  const where: Prisma.AgentRunWhereInput = {
    organizationId: input.organizationId
  };

  if (input.query.status) {
    where.status = input.query.status;
  }

  if (input.query.conversationId) {
    where.conversationId = input.query.conversationId;
  }

  if (input.query.from || input.query.to) {
    where.createdAt = {};

    if (input.query.from) {
      where.createdAt.gte = new Date(input.query.from);
    }

    if (input.query.to) {
      where.createdAt.lte = new Date(input.query.to);
    }
  }

  return where;
}

function getStepTimelineStatus(status: string) {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "skipped") return "skipped";

  return "info";
}

function getToolTimelineStatus(input: {
  approvalStatus: AgentToolApprovalStatus;
  status: string;
}) {
  if (input.approvalStatus === "PENDING") return "pending_approval";
  if (input.approvalStatus === "EXECUTED") return "success";
  if (input.approvalStatus === "REJECTED") return "rejected";
  if (input.approvalStatus === "FAILED") return "error";
  if (input.status === "completed") return "success";
  if (input.status === "failed") return "error";

  return "info";
}

function calculateDurationMs(input: {
  startedAt: Date;
  completedAt?: Date | null;
}) {
  if (!input.completedAt) {
    return null;
  }

  return input.completedAt.getTime() - input.startedAt.getTime();
}

async function getAgentRunScoped(input: {
  userId: string;
  agentRunId: string;
}) {
  const membership = await getPrimaryMembership(input.userId);

  const agentRun = await prisma.agentRun.findFirst({
    where: {
      id: input.agentRunId,
      organizationId: membership.organizationId
    },
    include: {
      steps: {
        orderBy: {
          createdAt: "asc"
        }
      },
      toolCalls: {
        orderBy: {
          createdAt: "asc"
        }
      },
      conversation: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true
        }
      },
      message: {
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!agentRun) {
    throw createNotFoundError("Agent run not found.");
  }

  return {
    membership,
    agentRun
  };
}

export async function listAgentRuns(input: {
  userId: string;
  query: ListAgentRunsQuery;
}) {
  const membership = await getPrimaryMembership(input.userId);

  const where = buildAgentRunWhere({
    organizationId: membership.organizationId,
    query: input.query
  });

  const runs = await prisma.agentRun.findMany({
    where,
    select: {
      id: true,
      externalRunId: true,
      status: true,
      question: true,
      standaloneQuestion: true,
      grounded: true,
      confidence: true,
      needsEscalation: true,
      escalationReason: true,
      provider: true,
      model: true,
      promptVersion: true,
      fallbackUsed: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      conversation: {
        select: {
          id: true,
          title: true
        }
      },
      _count: {
        select: {
          steps: true,
          toolCalls: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: input.query.limit
  });

  return {
    runs: runs.map((run) => ({
      ...run,
      durationMs: calculateDurationMs({
        startedAt: run.startedAt,
        completedAt: run.completedAt
      })
    }))
  };
}

export async function getAgentRunsSummary(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalRuns,
    runningRuns,
    completedRuns,
    guardrailRuns,
    failedRuns,
    pendingToolCalls,
    executedToolCalls,
    rejectedToolCalls,
    recentRuns
  ] = await Promise.all([
    prisma.agentRun.count({
      where: {
        organizationId: membership.organizationId
      }
    }),

    prisma.agentRun.count({
      where: {
        organizationId: membership.organizationId,
        status: "RUNNING"
      }
    }),

    prisma.agentRun.count({
      where: {
        organizationId: membership.organizationId,
        status: "COMPLETED"
      }
    }),

    prisma.agentRun.count({
      where: {
        organizationId: membership.organizationId,
        status: "COMPLETED_WITH_GUARDRAIL_WARNING"
      }
    }),

    prisma.agentRun.count({
      where: {
        organizationId: membership.organizationId,
        status: "FAILED"
      }
    }),

    prisma.agentToolCall.count({
      where: {
        approvalStatus: "PENDING",
        agentRun: {
          organizationId: membership.organizationId
        }
      }
    }),

    prisma.agentToolCall.count({
      where: {
        approvalStatus: "EXECUTED",
        agentRun: {
          organizationId: membership.organizationId
        }
      }
    }),

    prisma.agentToolCall.count({
      where: {
        approvalStatus: "REJECTED",
        agentRun: {
          organizationId: membership.organizationId
        }
      }
    }),

    prisma.agentRun.findMany({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          gte: last24Hours
        }
      },
      select: {
        id: true,
        status: true,
        confidence: true,
        grounded: true,
        needsEscalation: true,
        startedAt: true,
        completedAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    })
  ]);

  const completedDurations = recentRuns
    .map((run) =>
      calculateDurationMs({
        startedAt: run.startedAt,
        completedAt: run.completedAt
      })
    )
    .filter((duration): duration is number => typeof duration === "number");

  const averageDurationMs =
    completedDurations.length > 0
      ? Math.round(
          completedDurations.reduce((sum, value) => sum + value, 0) /
            completedDurations.length
        )
      : null;

  const groundedRecentRuns = recentRuns.filter((run) => run.grounded).length;
  const escalationRecentRuns = recentRuns.filter(
    (run) => run.needsEscalation
  ).length;

  return {
    totals: {
      totalRuns,
      runningRuns,
      completedRuns,
      guardrailRuns,
      failedRuns
    },
    toolCalls: {
      pendingApproval: pendingToolCalls,
      executed: executedToolCalls,
      rejected: rejectedToolCalls
    },
    last24Hours: {
      totalRuns: recentRuns.length,
      groundedRuns: groundedRecentRuns,
      escalationRuns: escalationRecentRuns,
      averageDurationMs
    }
  };
}

export async function getAgentRunDetail(input: {
  userId: string;
  agentRunId: string;
}) {
  const { agentRun } = await getAgentRunScoped(input);

  return {
    agentRun: {
      ...agentRun,
      durationMs: calculateDurationMs({
        startedAt: agentRun.startedAt,
        completedAt: agentRun.completedAt
      })
    }
  };
}

export async function getAgentRunTimeline(input: {
  userId: string;
  agentRunId: string;
}) {
  const { agentRun } = await getAgentRunScoped(input);

  const events: Array<Record<string, unknown>> = [];

  events.push({
    type: "agent_run.started",
    status: "info",
    title: "Agent run started",
    timestamp: agentRun.startedAt,
    data: {
      agentRunId: agentRun.id,
      externalRunId: agentRun.externalRunId,
      question: agentRun.question,
      standaloneQuestion: agentRun.standaloneQuestion
    }
  });

  for (const step of agentRun.steps) {
    events.push({
      type: `agent_step.${step.status}`,
      status: getStepTimelineStatus(step.status),
      title: `${step.agentName} ${step.status}`,
      timestamp: step.createdAt,
      data: {
        stepId: step.id,
        agentName: step.agentName,
        provider: step.provider,
        model: step.model,
        latencyMs: step.latencyMs,
        error: step.error
      }
    });
  }

  for (const toolCall of agentRun.toolCalls) {
    events.push({
      type: `agent_tool.${toolCall.approvalStatus.toLowerCase()}`,
      status: getToolTimelineStatus({
        approvalStatus: toolCall.approvalStatus,
        status: toolCall.status
      }),
      title: `${toolCall.toolName} — ${toolCall.approvalStatus}`,
      timestamp:
        toolCall.executedAt ||
        toolCall.approvedAt ||
        toolCall.rejectedAt ||
        toolCall.createdAt,
      data: {
        toolCallRecordId: toolCall.id,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        toolCategory: toolCall.toolCategory,
        requiresApproval: toolCall.requiresApproval,
        approvalStatus: toolCall.approvalStatus,
        status: toolCall.status,
        latencyMs: toolCall.latencyMs,
        reason: toolCall.reason,
        error: toolCall.error
      }
    });
  }

  if (agentRun.completedAt) {
    events.push({
      type: "agent_run.completed",
      status:
        agentRun.status === "FAILED"
          ? "error"
          : agentRun.status === "COMPLETED_WITH_GUARDRAIL_WARNING"
            ? "warning"
            : "success",
      title: `Agent run ${agentRun.status.toLowerCase()}`,
      timestamp: agentRun.completedAt,
      data: {
        agentRunId: agentRun.id,
        status: agentRun.status,
        grounded: agentRun.grounded,
        confidence: agentRun.confidence,
        needsEscalation: agentRun.needsEscalation,
        escalationReason: agentRun.escalationReason,
        durationMs: calculateDurationMs({
          startedAt: agentRun.startedAt,
          completedAt: agentRun.completedAt
        })
      }
    });
  }

  events.sort((a, b) => {
    return (
      new Date(a.timestamp as string | Date).getTime() -
      new Date(b.timestamp as string | Date).getTime()
    );
  });

  return {
    agentRunId: agentRun.id,
    status: agentRun.status,
    durationMs: calculateDurationMs({
      startedAt: agentRun.startedAt,
      completedAt: agentRun.completedAt
    }),
    events
  };
}

export async function getAgentRunDebug(input: {
  userId: string;
  agentRunId: string;
}) {

  if (!env.AGENT_RUN_DEBUG_PAYLOAD_ENABLED) {
  throw createForbiddenError(
    "Agent run debug payloads are disabled in this environment."
  );
}
  const { membership, agentRun } = await getAgentRunScoped(input);

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      organizationId: membership.organizationId,
      action: "AGENT_RUN_DEBUG_VIEWED",
      metadata: {
        agentRunId: agentRun.id,
        externalRunId: agentRun.externalRunId,
        status: agentRun.status
      } as Prisma.InputJsonValue
    }
  });

  return {
    agentRun: redactValue(agentRun)
  };
}