import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { app } from "../../app.js";
import { registerAndLoginTestUser } from "../../test/test-helpers.js";

async function createDebugAgentRun(input: {
  organizationId: string;
  userId: string;
}) {
  const run = await prisma.agentRun.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      status: "COMPLETED",
      question: "Debug test question",
      standaloneQuestion: "Debug test question",
      answer: "Debug test answer",
      grounded: true,
      confidence: "high",
      metadata: {
        accessToken: "secret-access-token",
        nested: {
          apiKey: "secret-api-key",
          safeValue: "visible"
        }
      }
    }
  });

  await prisma.agentStep.create({
    data: {
      agentRunId: run.id,
      agentName: "triage_agent",
      status: "completed",
      input: {
        OPENROUTER_API_KEY: "secret-provider-key"
      },
      output: {
        category: "billing"
      }
    }
  });

  return run;
}

describe("Agent observability safety", () => {
  it("allows OWNER to read debug payload with redaction", async () => {
    const { user, membership, accessToken } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    const run = await createDebugAgentRun({
      organizationId: membership.organizationId,
      userId: user.id
    });

    const response = await request(app)
      .get(`/api/chat/agent/runs/${run.id}/debug`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const raw = JSON.stringify(response.body);

    expect(raw).toContain("[REDACTED]");
    expect(raw).not.toContain("secret-access-token");
    expect(raw).not.toContain("secret-api-key");
    expect(raw).not.toContain("secret-provider-key");
  });

  it("blocks SUPPORT_AGENT from debug payload", async () => {
    const { user, membership } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    const run = await createDebugAgentRun({
      organizationId: membership.organizationId,
      userId: user.id
    });

    const support = await registerAndLoginTestUser({
      role: "SUPPORT_AGENT"
    });

    const response = await request(app)
      .get(`/api/chat/agent/runs/${run.id}/debug`)
      .set("Authorization", `Bearer ${support.accessToken}`);

    expect(response.status).toBe(403);
  });
});