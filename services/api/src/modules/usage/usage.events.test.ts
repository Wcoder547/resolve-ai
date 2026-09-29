import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import {
  API_PREFIX,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";
import { recordAiUsage } from "./usage.service.js";

describe("Usage events route", () => {
  it("lists AI usage events after recording usage", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser({
      role: "OWNER",
    });

    await recordAiUsage({
      organizationId: membership.organizationId,
      userId: user.id,
      operation: "rag_chat_answer",
      provider: "test-provider",
      model: "test-model",
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
      isEstimated: true,
    });

    const response = await request(app)
      .get(`${API_PREFIX}/usage/ai/events`)
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.events.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.events[0].operation).toBe("rag_chat_answer");
  });
});
