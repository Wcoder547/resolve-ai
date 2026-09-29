import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import {
  API_PREFIX,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";

const mockRagResponse = {
  success: true,
  message: "ok",
  data: {
    answer: "Refunds are available within 14 days.",
    sources: [],
    citations: [],
    model: "mock-model",
    provider: "mock-provider",
    grounded: true,
    confidence: "high",
    needsEscalation: false,
    escalationReason: null,
    guardrails: {
      approved: true,
      grounded: true,
      hasCitations: true,
      citationCount: 1,
      riskLevel: "low",
      unsupportedReason: null,
    },
    promptVersion: "v1",
    fallbackUsed: false,
    providerErrors: [],
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      isEstimated: true,
    },
  },
};

vi.mock("./chat.ai-client.js", () => ({
  callAIRagChatService: vi.fn(async () => mockRagResponse),
  callAIRagChatStream: vi.fn(async function* () {
    yield { type: "token", text: "Refunds " };
    yield { type: "token", text: "are available." };
    yield { type: "done", data: mockRagResponse.data };
  }),
}));

vi.mock("./chat.agent-client.js", () => ({
  callAIAgenticResolveService: vi.fn(async () => ({
    success: true,
    message: "ok",
    data: {
      answer: "Agent recommends verifying subscription webhooks.",
      agentRunId: "external-agent-run",
      status: "COMPLETED",
      agentsUsed: ["triage_agent", "resolution_agent"],
      steps: [
        {
          agentName: "triage_agent",
          status: "completed",
          provider: "mock",
          model: "mock",
          latencyMs: 12,
          input: { question: "test" },
          output: { category: "billing" },
          error: null,
        },
      ],
      toolCalls: [],
      sources: [],
      citations: [],
      triage: { category: "billing" },
      retrievalReview: {},
      diagnostic: {},
      resolution: {},
      qa: {},
      grounded: true,
      confidence: "high",
      needsEscalation: false,
      escalationReason: null,
      provider: "mock-provider",
      model: "mock-model",
      promptVersion: "v1",
      fallbackUsed: false,
      providerErrors: [],
    },
  })),
}));

describe("Chat ask and conversations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("answers with no-context fallback when knowledge is empty", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "SUPPORT_AGENT",
    });

    const response = await request(app)
      .post(`${API_PREFIX}/chat/ask`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        question: "How do refunds work for annual plans?",
        limit: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.grounded).toBe(false);
    expect(response.body.data.conversationId).toBeTruthy();
    expect(response.body.data.answer).toBeTruthy();
  });

  it("lists, gets, and deletes conversations created by ask", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "OWNER",
    });

    const ask = await request(app)
      .post(`${API_PREFIX}/chat/ask`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        question: "What is the escalation path for billing issues?",
      });

    expect(ask.status).toBe(200);
    const conversationId = ask.body.data.conversationId as string;

    const list = await request(app)
      .get(`${API_PREFIX}/chat/conversations`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(list.status).toBe(200);
    expect(
      list.body.data.conversations.some(
        (item: { id: string }) => item.id === conversationId,
      ),
    ).toBe(true);

    const detail = await request(app)
      .get(`${API_PREFIX}/chat/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.conversation.messages.length).toBeGreaterThanOrEqual(2);

    const deleted = await request(app)
      .delete(`${API_PREFIX}/chat/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleted.status).toBe(200);

    const missing = await request(app)
      .get(`${API_PREFIX}/chat/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(missing.status).toBe(404);
  });

  it("streams ask events when stream client is mocked", async () => {
    const owner = await registerAndLoginTestUser({ role: "OWNER" });

    const response = await request(app)
      .post(`${API_PREFIX}/chat/ask/stream`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => callback(null, data));
      })
      .send({
        question: "How do refunds work for annual plans?",
        limit: 5,
      });

    expect(response.status).toBe(200);
    expect(String(response.body)).toMatch(/data:|event:|conversation|answer|token|done|status/i);
  });

  it("creates an agent run via agent ask with mocked AI", async () => {
    const { accessToken, membership } = await registerAndLoginTestUser({
      role: "OWNER",
    });

    const response = await request(app)
      .post(`${API_PREFIX}/chat/agent/ask`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        question: "Payment succeeded but subscription did not activate.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const runs = await prisma.agentRun.findMany({
      where: { organizationId: membership.organizationId },
    });
    expect(runs.length).toBeGreaterThanOrEqual(1);
  });

  it("lists agent runs, summary, detail, timeline, and pending tool calls", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser({
      role: "OWNER",
    });

    const run = await prisma.agentRun.create({
      data: {
        organizationId: membership.organizationId,
        userId: user.id,
        status: "COMPLETED",
        question: "Why did provisioning fail?",
        standaloneQuestion: "Why did provisioning fail?",
        answer: "Check webhook retries.",
        grounded: true,
        confidence: "medium",
      },
    });

    await prisma.agentStep.create({
      data: {
        agentRunId: run.id,
        agentName: "triage_agent",
        status: "completed",
        input: { question: "Why did provisioning fail?" },
        output: { category: "billing" },
        latencyMs: 10,
      },
    });

    await prisma.agentToolCall.create({
      data: {
        agentRunId: run.id,
        toolCallId: "pending-1",
        toolName: "create_support_ticket",
        toolCategory: "REQUIRES_APPROVAL",
        requiresApproval: true,
        status: "pending_approval",
        approvalStatus: "PENDING",
        input: { title: "Provisioning failure" },
      },
    });

    const list = await request(app)
      .get(`${API_PREFIX}/chat/agent/runs`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(200);

    const summary = await request(app)
      .get(`${API_PREFIX}/chat/agent/runs/summary`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(summary.status).toBe(200);

    const detail = await request(app)
      .get(`${API_PREFIX}/chat/agent/runs/${run.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detail.status).toBe(200);

    const timeline = await request(app)
      .get(`${API_PREFIX}/chat/agent/runs/${run.id}/timeline`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(timeline.status).toBe(200);

    const pending = await request(app)
      .get(`${API_PREFIX}/chat/agent/tool-calls/pending`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.toolCalls.length).toBeGreaterThanOrEqual(1);
  });
});
