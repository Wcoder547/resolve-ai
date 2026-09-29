import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import {
  API_PREFIX,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";

describe("Integrations API", () => {
  it("creates, lists without credentials, updates status, and deletes", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const created = await request(app)
      .post(`${API_PREFIX}/integrations/`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        provider: "SLACK_WEBHOOK",
        name: "Ops Slack",
        credentials: {
          webhookUrl: "https://hooks.slack.example.com/services/T000/B000/XXX",
          secretHeaderName: "x-slack-secret",
          secretHeaderValue: "super-secret-value",
        },
      });

    expect(created.status).toBe(201);
    expect(created.body.data.integration.id).toBeTruthy();
    expect(JSON.stringify(created.body)).not.toContain("super-secret-value");
    expect(JSON.stringify(created.body)).not.toContain(
      "https://hooks.slack.example.com/services/T000/B000/XXX",
    );
    const integrationId = created.body.data.integration.id as string;

    const list = await request(app)
      .get(`${API_PREFIX}/integrations/`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.integrations.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(list.body)).not.toContain("super-secret-value");
    expect(JSON.stringify(list.body)).not.toContain("encryptedCredentials");

    const disabled = await request(app)
      .patch(`${API_PREFIX}/integrations/${integrationId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "DISABLED" });

    expect(disabled.status).toBe(200);
    expect(disabled.body.data.integration.status).toBe("DISABLED");

    const deleted = await request(app)
      .delete(`${API_PREFIX}/integrations/${integrationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleted.status).toBe(200);

    const afterDelete = await request(app)
      .get(`${API_PREFIX}/integrations/`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(
      afterDelete.body.data.integrations.some(
        (item: { id: string }) => item.id === integrationId,
      ),
    ).toBe(false);
  });
});
