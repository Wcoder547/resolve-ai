import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { registerAndLoginTestUser } from "../../test/test-helpers.js";

describe("Usage Routes", () => {
  it("allows OWNER to read AI usage summary", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    const response = await request(app)
      .get("/api/usage/ai/summary")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.daily).toBeTruthy();
    expect(response.body.data.monthly).toBeTruthy();
  });

  it("blocks SUPPORT_AGENT from reading AI usage summary", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "SUPPORT_AGENT"
    });

    const response = await request(app)
      .get("/api/usage/ai/summary")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});