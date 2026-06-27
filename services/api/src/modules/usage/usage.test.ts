import { describe, expect, it } from "vitest";
import {
  getOrganizationAiUsageSummary,
  recordAiUsage
} from "./usage.service.js";
import { registerAndLoginTestUser } from "../../test/test-helpers.js";

describe("AI Usage Tracking", () => {
  it("records AI usage and updates daily summary", async () => {
    const { user, membership } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    await recordAiUsage({
      organizationId: membership.organizationId,
      userId: user.id,
      operation: "rag_chat_answer",
      provider: "test-provider",
      model: "test-model",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      isEstimated: true
    });

    const summary = await getOrganizationAiUsageSummary(
      membership.organizationId
    );

    expect(summary.daily.requestCount).toBe(1);
    expect(summary.daily.promptTokens).toBe(100);
    expect(summary.daily.completionTokens).toBe(50);
    expect(summary.daily.totalTokens).toBe(150);

    expect(summary.monthly.requestCount).toBe(1);
    expect(summary.monthly.totalTokens).toBe(150);
  });
});