import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptJson } from "../../lib/encryption.js";
import { prisma } from "../../lib/prisma.js";
import { app } from "../../app.js";
import { registerAndLoginTestUser } from "../../test/test-helpers.js";
import {
  approveAgentToolCall,
  rejectAgentToolCall
} from "./chat.tool-approval.service.js";

function createFetchResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function createPendingToolCall(input: {
  organizationId: string;
  userId: string;
}) {
  const agentRun = await prisma.agentRun.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      status: "COMPLETED",
      question: "Payment is successful but subscription is not activated.",
      standaloneQuestion:
        "Payment is successful but subscription is not activated.",
      grounded: true,
      confidence: "high"
    }
  });

  const toolCall = await prisma.agentToolCall.create({
    data: {
      agentRunId: agentRun.id,
      toolCallId: "test-tool-call-id",
      toolName: "create_support_ticket",
      toolCategory: "REQUIRES_APPROVAL",
      requiresApproval: true,
      status: "pending_approval",
      approvalStatus: "PENDING",
      reason: "Create ticket after human approval",
      input: {
        title: "Subscription activation failed",
        summary: "Payment succeeded but subscription did not activate",
        priority: "high"
      }
    }
  });

  return {
    agentRun,
    toolCall
  };
}

describe("Agent tool approval safety", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks SUPPORT_AGENT from approving tool calls at route level", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "SUPPORT_AGENT"
    });

    const response = await request(app)
      .post("/api/chat/agent/tool-calls/00000000-0000-0000-0000-000000000000/approve")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("rejects a pending approval-required tool call", async () => {
    const { user, membership } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    const { toolCall } = await createPendingToolCall({
      organizationId: membership.organizationId,
      userId: user.id
    });

    const result = await rejectAgentToolCall({
      userId: user.id,
      toolCallRecordId: toolCall.id,
      reason: "Missing customer identifier"
    });

    expect(result.toolCall.approvalStatus).toBe("REJECTED");
    expect(result.toolCall.status).toBe("rejected");
    expect(result.toolCall.rejectedByUserId).toBe(user.id);
  });

  it("approves and executes a pending ticket tool call through ticketing integration", async () => {
    const { user, membership } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    await prisma.organizationIntegration.create({
      data: {
        organizationId: membership.organizationId,
        provider: "TICKETING_WEBHOOK",
        name: "Test Ticketing Webhook",
        status: "ACTIVE",
        config: {},
        encryptedCredentials: encryptJson({
          webhookUrl: "https://ticketing.example.com/webhook",
          secretHeaderName: "x-test-secret",
          secretHeaderValue: "test-secret"
        }),
        createdByUserId: user.id,
        updatedByUserId: user.id
      }
    });

    const { toolCall } = await createPendingToolCall({
      organizationId: membership.organizationId,
      userId: user.id
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        createFetchResponse({
          ok: true,
          ticketId: "TICKET-123"
        })
      )
    );

    const result = await approveAgentToolCall({
      userId: user.id,
      toolCallRecordId: toolCall.id
    });

    expect(result.executed.approvalStatus).toBe("EXECUTED");
    expect(result.executed.status).toBe("completed");
    expect(result.execution.output.externalWritePerformed).toBe(true);
    expect(result.execution.output.integrationProvider).toBe("TICKETING_WEBHOOK");

    const executionLogs = await prisma.integrationExecutionLog.findMany({
      where: {
        organizationId: membership.organizationId,
        provider: "TICKETING_WEBHOOK"
      }
    });

    expect(executionLogs.length).toBe(1);
    expect(executionLogs[0].status).toBe("completed");
  });

  it("does not leak encrypted integration credentials in list API", async () => {
    const { user, membership, accessToken } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    await prisma.organizationIntegration.create({
      data: {
        organizationId: membership.organizationId,
        provider: "TICKETING_WEBHOOK",
        name: "Secret Ticketing Webhook",
        status: "ACTIVE",
        config: {},
        encryptedCredentials: encryptJson({
          webhookUrl: "https://secret.example.com/webhook",
          secretHeaderName: "x-secret",
          secretHeaderValue: "very-secret-value"
        }),
        createdByUserId: user.id,
        updatedByUserId: user.id
      }
    });

    const response = await request(app)
      .get("/api/integrations")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain("very-secret-value");
    expect(JSON.stringify(response.body)).not.toContain("encryptedCredentials");
  });
});