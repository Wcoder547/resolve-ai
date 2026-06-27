import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { registerAndLoginTestUser } from "../../test/test-helpers.js";

describe("RBAC", () => {
  it("returns current user's role and permissions", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "OWNER"
    });

    const response = await request(app)
      .get("/api/rbac/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.role).toBe("OWNER");
    expect(response.body.data.permissions).toContain("chat:ask");
    expect(response.body.data.permissions).toContain("knowledge:upload");
  });

  it("blocks VIEWER from asking chat", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "VIEWER"
    });

    const response = await request(app)
      .post("/api/chat/ask")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        question: "Payment is successful but subscription is not active.",
        limit: 5
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("allows SUPPORT_AGENT to access chat permission layer", async () => {
    const { accessToken } = await registerAndLoginTestUser({
      role: "SUPPORT_AGENT"
    });

    const response = await request(app)
      .post("/api/chat/ask")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        question: "Payment is successful but subscription is not active.",
        limit: 5
      });

    expect(response.status).not.toBe(403);
  });
});