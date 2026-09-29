import { Prisma, TicketPriority } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

import {
  executeSlackWebhook,
  executeTicketingWebhook,
} from "../integrations/integration.providers.js";
import { createTicketFromAgentTool } from "../tickets/ticket.service.js";

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapToolPriority(value: unknown): TicketPriority {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  switch (normalized) {
    case "low":
      return TicketPriority.LOW;
    case "high":
      return TicketPriority.HIGH;
    case "urgent":
      return TicketPriority.URGENT;
    case "medium":
    default:
      return TicketPriority.MEDIUM;
  }
}

async function executeApprovedExternalTool(input: {
  organizationId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  approvedByUserId: string;
}) {
  if (input.toolName === "create_support_ticket") {
    const subject =
      asOptionalString(input.toolInput.title) ||
      asOptionalString(input.toolInput.subject) ||
      "Support issue requires review";

    const summary =
      asOptionalString(input.toolInput.summary) ||
      asOptionalString(input.toolInput.description);

    const agentRunId = asOptionalString(input.metadata?.agentRunId);
    let confidence = asOptionalString(input.toolInput.confidence);
    let conversationId = asOptionalString(input.toolInput.conversationId);

    if (agentRunId && (!confidence || !conversationId)) {
      const agentRun = await prisma.agentRun.findFirst({
        where: {
          id: agentRunId,
          organizationId: input.organizationId,
        },
        select: {
          confidence: true,
          conversationId: true,
        },
      });

      if (!confidence) confidence = agentRun?.confidence ?? null;
      if (!conversationId) conversationId = agentRun?.conversationId ?? null;
    }

    const ticket = await createTicketFromAgentTool({
      organizationId: input.organizationId,
      createdByUserId: input.approvedByUserId,
      subject,
      description: summary,
      summary,
      priority: mapToolPriority(input.toolInput.priority),
      confidence,
      customerName:
        asOptionalString(input.toolInput.customerName) ||
        asOptionalString(input.toolInput.customer),
      customerEmail: asOptionalString(input.toolInput.customerEmail),
      agentRunId,
      conversationId,
      metadata: {
        toolCallId: input.metadata?.toolCallId ?? null,
        toolCallRecordId: input.metadata?.toolCallRecordId ?? null,
        source: "agent_tool_approval",
        toolInput: input.toolInput,
      },
    });

    const webhookResult = await executeTicketingWebhook(input);

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
        ticketId: ticket.id,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          confidence: ticket.confidence,
        },
        externalWritePerformed: webhookResult.externalWritePerformed,
        webhookSkipped: webhookResult.skipped,
        webhookSkipReason: webhookResult.reason,
        integrationProvider: webhookResult.integrationProvider,
        integrationId: webhookResult.integrationId,
        response: webhookResult.response,
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
      approvedByUserId: input.userId,
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
