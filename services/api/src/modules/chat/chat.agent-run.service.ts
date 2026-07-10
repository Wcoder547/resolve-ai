import {
  AgentRunStatus,
  AgentToolApprovalStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AgenticResolveResponse } from "./chat.agent-client.js";



function mapApprovalStatus(status?: string): AgentToolApprovalStatus {
  if (status === "PENDING") return "PENDING";
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "EXECUTED") return "EXECUTED";
  if (status === "FAILED") return "FAILED";

  return "NOT_REQUIRED";
}

function mapAgentStatus(status: string): AgentRunStatus {
  if (status === "completed") {
    return "COMPLETED";
  }

  if (status === "completed_with_guardrail_warning") {
    return "COMPLETED_WITH_GUARDRAIL_WARNING";
  }

  if (status === "failed") {
    return "FAILED";
  }

  return "COMPLETED";
}

export async function createAgentRunRecord(input: {
  organizationId: string;
  userId: string;
  conversationId: string;
  messageId: string;
  question: string;
  standaloneQuestion: string;
  retrievalQuery: string;
  retrievalMode?: string;
  embedding?: unknown;
}) {
  return prisma.agentRun.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      status: "RUNNING",
      question: input.question,
      standaloneQuestion: input.standaloneQuestion,
      metadata: {
        retrievalQuery: input.retrievalQuery,
        retrievalMode: input.retrievalMode,
        embedding: input.embedding
      } as Prisma.InputJsonValue
    }
  });
}

export async function completeAgentRunRecord(input: {
  agentRunId: string;
  response: AgenticResolveResponse;
}) {
  const data = input.response.data;

  return prisma.$transaction(async (tx) => {
    const updatedRun = await tx.agentRun.update({
      where: {
        id: input.agentRunId
      },
      data: {
        externalRunId: data.agentRunId,
        status: mapAgentStatus(data.status),
        answer: data.answer,

        agentsUsed: data.agentsUsed as Prisma.InputJsonValue,
        citations: data.citations as Prisma.InputJsonValue,
        triage: data.triage as Prisma.InputJsonValue,
        retrievalReview: data.retrievalReview as Prisma.InputJsonValue,
        diagnostic: data.diagnostic as Prisma.InputJsonValue,
        resolution: data.resolution as Prisma.InputJsonValue,
        qa: data.qa as Prisma.InputJsonValue,

        grounded: data.grounded,
        confidence: data.confidence,
        needsEscalation: data.needsEscalation,
        escalationReason: data.escalationReason || null,

        provider: data.provider,
        model: data.model,
        promptVersion: data.promptVersion,
        fallbackUsed: data.fallbackUsed || false,
        providerErrors: (data.providerErrors || []) as Prisma.InputJsonValue,

        completedAt: new Date()
      }
    });

    if (data.steps.length > 0) {
      await tx.agentStep.createMany({
        data: data.steps.map((step) => ({
          agentRunId: input.agentRunId,
          agentName: step.agentName,
          status: step.status,
          provider: step.provider || null,
          model: step.model || null,
          latencyMs: step.latencyMs,
          input: step.input as Prisma.InputJsonValue,
          output: step.output as Prisma.InputJsonValue,
          error: step.error || null
        }))
      });
    }

    if (data.toolCalls.length > 0) {
      await tx.agentToolCall.createMany({
        data: data.toolCalls.map((toolCall) => ({
          agentRunId: input.agentRunId,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          toolCategory: toolCall.toolCategory || null,
          requiresApproval: toolCall.requiresApproval || false,
          status: toolCall.status,
          approvalStatus: mapApprovalStatus(toolCall.approvalStatus),
          reason: toolCall.reason || null,
          latencyMs: toolCall.latencyMs,
          input: toolCall.input as Prisma.InputJsonValue,
          output: toolCall.output as Prisma.InputJsonValue,
          error: toolCall.error || null,
          executedAt:
            toolCall.approvalStatus === "EXECUTED" ||
            toolCall.status === "completed"
              ? new Date()
              : null
        }))
      });
    }

    return updatedRun;
  });
}

export async function failAgentRunRecord(input: {
  agentRunId: string;
  error: string;
}) {
  return prisma.agentRun.update({
    where: {
      id: input.agentRunId
    },
    data: {
      status: "FAILED",
      metadata: {
        error: input.error,
        failedAt: new Date().toISOString()
      } as Prisma.InputJsonValue,
      completedAt: new Date()
    }
  });
}

