import { AgentToolApprovalStatus, Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

import {
  executeSlackWebhook,
  executeTicketingWebhook,
} from "../integrations/integration.providers.js";

async function executeApprovedExternalTool(input: {
  organizationId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  if (input.toolName === "create_support_ticket") {
    const result = await executeTicketingWebhook(input);

    return {
      toolCallId: input.metadata?.toolCallId as string | undefined,
      toolName: input.toolName,
      toolCategory: "REQUIRES_APPROVAL",
      requiresApproval: true,
      approvalStatus: "EXECUTED",
      status: "completed",
      reason: input.metadata?.reason as string | undefined,
      latencyMs: 0,
      input: input.toolInput,
      output: {
        created: true,
        mockExecution: false,
        externalWritePerformed: true,
        integrationProvider: result.integrationProvider,
        integrationId: result.integrationId,
        response: result.response,
      },
      error: null,
    };
  }

  if (input.toolName === "send_escalation_notification") {
    const result = await executeSlackWebhook(input);

    return {
      toolCallId: input.metadata?.toolCallId as string | undefined,
      toolName: input.toolName,
      toolCategory: "REQUIRES_APPROVAL",
      requiresApproval: true,
      approvalStatus: "EXECUTED",
      status: "completed",
      reason: input.metadata?.reason as string | undefined,
      latencyMs: 0,
      input: input.toolInput,
      output: {
        sent: true,
        externalWritePerformed: true,
        integrationProvider: result.integrationProvider,
        integrationId: result.integrationId,
        response: result.response,
      },
      error: null,
    };
  }

  const error = new Error(
    `No external integration executor found for tool: ${input.toolName}`,
  );
  error.name = "IntegrationExecutionError";
  throw error;
}

function createForbiddenError(message: string) {
  const error = new Error(message);
  error.name = "ForbiddenError";
  return error;
}

function createNotFoundError(message: string) {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}

function createConflictError(message: string) {
  const error = new Error(message);
  error.name = "ConflictError";
  return error;
}

function createDisabledError() {
  return createForbiddenError("Agent tool approval is currently disabled.");
}

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    throw createNotFoundError("No organization found for this user.");
  }

  return membership;
}

async function writeToolAuditLog(input: {
  userId: string;
  organizationId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      action: input.action,
      metadata: (input.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listPendingAgentToolCalls(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const toolCalls = await prisma.agentToolCall.findMany({
    where: {
      requiresApproval: true,
      approvalStatus: "PENDING",
      agentRun: {
        organizationId: membership.organizationId,
      },
    },
    include: {
      agentRun: {
        select: {
          id: true,
          externalRunId: true,
          question: true,
          standaloneQuestion: true,
          status: true,
          confidence: true,
          needsEscalation: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return {
    toolCalls,
  };
}

export async function approveAgentToolCall(input: {
  userId: string;
  toolCallRecordId: string;
}) {
  if (!env.AGENT_TOOL_APPROVAL_ENABLED) {
    throw createDisabledError();
  }

  const membership = await getPrimaryMembership(input.userId);

  const toolCall = await prisma.agentToolCall.findFirst({
    where: {
      id: input.toolCallRecordId,
      agentRun: {
        organizationId: membership.organizationId,
      },
    },
    include: {
      agentRun: true,
    },
  });

  if (!toolCall) {
    throw createNotFoundError("Tool call not found.");
  }

  if (!toolCall.requiresApproval) {
    throw createConflictError("This tool call does not require approval.");
  }

  if (toolCall.approvalStatus !== "PENDING") {
    throw createConflictError(
      `Tool call is not pending approval. Current status: ${toolCall.approvalStatus}`,
    );
  }

  const approvedToolCall = await prisma.agentToolCall.update({
    where: {
      id: toolCall.id,
    },
    data: {
      approvalStatus: "APPROVED",
      approvedByUserId: input.userId,
      approvedAt: new Date(),
    },
  });

  await writeToolAuditLog({
    userId: input.userId,
    organizationId: membership.organizationId,
    action: "AGENT_TOOL_CALL_APPROVED",
    metadata: {
      toolCallRecordId: toolCall.id,
      agentRunId: toolCall.agentRunId,
      toolName: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
    },
  });

  try {
    const executionData = await executeApprovedExternalTool({
      organizationId: membership.organizationId,
      toolName: toolCall.toolName,
      toolInput: (toolCall.input || {}) as Record<string, unknown>,
      metadata: {
        organizationId: membership.organizationId,
        approvedByUserId: input.userId,
        toolCallRecordId: toolCall.id,
        agentRunId: toolCall.agentRunId,
        toolCallId: toolCall.toolCallId || toolCall.id,
        reason: toolCall.reason,
      },
    });

    const executedToolCall = await prisma.agentToolCall.update({
      where: {
        id: toolCall.id,
      },
      data: {
        status: executionData.status,
        approvalStatus: "EXECUTED",
        latencyMs: executionData.latencyMs,
        output: executionData.output as Prisma.InputJsonValue,
        error: executionData.error || null,
        executedAt: new Date(),
      },
    });

    await writeToolAuditLog({
      userId: input.userId,
      organizationId: membership.organizationId,
      action: "AGENT_TOOL_CALL_EXECUTED",
      metadata: {
        toolCallRecordId: toolCall.id,
        agentRunId: toolCall.agentRunId,
        toolName: toolCall.toolName,
        output: executionData.output,
      },
    });

    return {
      approved: approvedToolCall,
      executed: executedToolCall,
      execution: executionData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown tool execution error.";

    const failedToolCall = await prisma.agentToolCall.update({
      where: {
        id: toolCall.id,
      },
      data: {
        status: "failed",
        approvalStatus: "FAILED",
        error: errorMessage,
        executedAt: new Date(),
      },
    });

    await writeToolAuditLog({
      userId: input.userId,
      organizationId: membership.organizationId,
      action: "AGENT_TOOL_CALL_EXECUTION_FAILED",
      metadata: {
        toolCallRecordId: toolCall.id,
        agentRunId: toolCall.agentRunId,
        toolName: toolCall.toolName,
        error: errorMessage,
      },
    });

    return {
      approved: approvedToolCall,
      executed: failedToolCall,
      execution: {
        status: "failed",
        error: errorMessage,
      },
    };
  }
}

export async function rejectAgentToolCall(input: {
  userId: string;
  toolCallRecordId: string;
  reason?: string;
}) {
  if (!env.AGENT_TOOL_APPROVAL_ENABLED) {
    throw createDisabledError();
  }

  const membership = await getPrimaryMembership(input.userId);

  const toolCall = await prisma.agentToolCall.findFirst({
    where: {
      id: input.toolCallRecordId,
      agentRun: {
        organizationId: membership.organizationId,
      },
    },
    include: {
      agentRun: true,
    },
  });

  if (!toolCall) {
    throw createNotFoundError("Tool call not found.");
  }

  if (!toolCall.requiresApproval) {
    throw createConflictError("This tool call does not require approval.");
  }

  if (toolCall.approvalStatus !== "PENDING") {
    throw createConflictError(
      `Tool call is not pending approval. Current status: ${toolCall.approvalStatus}`,
    );
  }

  const rejectedToolCall = await prisma.agentToolCall.update({
    where: {
      id: toolCall.id,
    },
    data: {
      status: "rejected",
      approvalStatus: "REJECTED",
      rejectedByUserId: input.userId,
      rejectedAt: new Date(),
      error: input.reason || "Rejected by human reviewer.",
    },
  });

  await writeToolAuditLog({
    userId: input.userId,
    organizationId: membership.organizationId,
    action: "AGENT_TOOL_CALL_REJECTED",
    metadata: {
      toolCallRecordId: toolCall.id,
      agentRunId: toolCall.agentRunId,
      toolName: toolCall.toolName,
      reason: input.reason || null,
    },
  });

  return {
    toolCall: rejectedToolCall,
  };
}
