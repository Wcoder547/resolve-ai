import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

type RecordAiUsageInput = {
  organizationId: string;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  operation: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isEstimated?: boolean;
  metadata?: Record<string, unknown>;
};

function startOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function createUsageLimitError(message: string) {
  const error = new Error(message);
  error.name = "UsageLimitError";
  return error;
}

function calculateEstimatedCostUsd(input: {
  promptTokens: number;
  completionTokens: number;
}) {
  const inputCost =
    (input.promptTokens / 1_000_000) * env.AI_INPUT_COST_PER_1M_TOKENS;

  const outputCost =
    (input.completionTokens / 1_000_000) * env.AI_OUTPUT_COST_PER_1M_TOKENS;

  return Number((inputCost + outputCost).toFixed(8));
}

export async function assertOrganizationAiUsageAllowed(organizationId: string) {
  if (!env.AI_USAGE_TRACKING_ENABLED) {
    return;
  }

  const today = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const dailyUsage = await prisma.organizationAiUsageDaily.findUnique({
    where: {
      organizationId_date: {
        organizationId,
        date: today
      }
    }
  });

  if (dailyUsage) {
    if (dailyUsage.requestCount >= env.AI_DAILY_REQUEST_LIMIT) {
      throw createUsageLimitError(
        "Daily AI request limit reached for this organization."
      );
    }

    if (dailyUsage.totalTokens >= env.AI_DAILY_TOKEN_LIMIT) {
      throw createUsageLimitError(
        "Daily AI token limit reached for this organization."
      );
    }
  }

  const monthlyUsage = await prisma.aiUsageEvent.aggregate({
    where: {
      organizationId,
      createdAt: {
        gte: monthStart
      }
    },
    _sum: {
      totalTokens: true
    }
  });

  const monthlyTokens = monthlyUsage._sum.totalTokens || 0;

  if (monthlyTokens >= env.AI_MONTHLY_TOKEN_LIMIT) {
    throw createUsageLimitError(
      "Monthly AI token limit reached for this organization."
    );
  }
}

export async function recordAiUsage(input: RecordAiUsageInput) {
  if (!env.AI_USAGE_TRACKING_ENABLED) {
    return null;
  }

  const promptTokens = Math.max(0, Math.floor(input.promptTokens || 0));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens || 0));

  const totalTokens = Math.max(
    0,
    Math.floor(input.totalTokens || promptTokens + completionTokens)
  );

  const estimatedCostUsd = calculateEstimatedCostUsd({
    promptTokens,
    completionTokens
  });

  const today = startOfUtcDay();

  return prisma.$transaction(async (tx) => {
    const event = await tx.aiUsageEvent.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId || null,
        conversationId: input.conversationId || null,
        messageId: input.messageId || null,
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd,
        isEstimated: input.isEstimated ?? true,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue
      }
    });

    await tx.organizationAiUsageDaily.upsert({
      where: {
        organizationId_date: {
          organizationId: input.organizationId,
          date: today
        }
      },
      create: {
        organizationId: input.organizationId,
        date: today,
        requestCount: 1,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd
      },
      update: {
        requestCount: {
          increment: 1
        },
        promptTokens: {
          increment: promptTokens
        },
        completionTokens: {
          increment: completionTokens
        },
        totalTokens: {
          increment: totalTokens
        },
        estimatedCostUsd: {
          increment: estimatedCostUsd
        }
      }
    });

    return event;
  });
}

export async function getOrganizationAiUsageSummary(organizationId: string) {
  const today = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const dailyUsage = await prisma.organizationAiUsageDaily.findUnique({
    where: {
      organizationId_date: {
        organizationId,
        date: today
      }
    }
  });

  const monthlyUsage = await prisma.aiUsageEvent.aggregate({
    where: {
      organizationId,
      createdAt: {
        gte: monthStart
      }
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      estimatedCostUsd: true
    },
    _count: {
      id: true
    }
  });

  return {
    daily: {
      date: today,
      requestCount: dailyUsage?.requestCount || 0,
      promptTokens: dailyUsage?.promptTokens || 0,
      completionTokens: dailyUsage?.completionTokens || 0,
      totalTokens: dailyUsage?.totalTokens || 0,
      estimatedCostUsd: dailyUsage?.estimatedCostUsd || 0,
      limits: {
        requestLimit: env.AI_DAILY_REQUEST_LIMIT,
        tokenLimit: env.AI_DAILY_TOKEN_LIMIT
      }
    },
    monthly: {
      monthStart,
      requestCount: monthlyUsage._count.id,
      promptTokens: monthlyUsage._sum.promptTokens || 0,
      completionTokens: monthlyUsage._sum.completionTokens || 0,
      totalTokens: monthlyUsage._sum.totalTokens || 0,
      estimatedCostUsd: monthlyUsage._sum.estimatedCostUsd || 0,
      limits: {
        tokenLimit: env.AI_MONTHLY_TOKEN_LIMIT
      }
    }
  };
}