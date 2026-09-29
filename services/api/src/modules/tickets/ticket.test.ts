import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import {
  API_PREFIX,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";

describe("Tickets API", () => {
  it("lists empty tickets and supports create/get/update", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const empty = await request(app)
      .get(`${API_PREFIX}/tickets/`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(empty.status).toBe(200);
    expect(empty.body.data.tickets).toEqual([]);

    const created = await request(app)
      .post(`${API_PREFIX}/tickets/`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        subject: "Subscription not activating",
        description: "Payment succeeded but access was not granted.",
        priority: "HIGH",
        customerEmail: "customer@example.com",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.ticket.subject).toBe(
      "Subscription not activating",
    );

    const ticketId = created.body.data.ticket.id as string;

    const detail = await request(app)
      .get(`${API_PREFIX}/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.ticket.id).toBe(ticketId);

    const updated = await request(app)
      .patch(`${API_PREFIX}/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        status: "RESOLVED",
        summary: "Fixed webhook retry configuration.",
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.ticket.status).toBe("RESOLVED");

    const missing = await request(app)
      .get(`${API_PREFIX}/tickets/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(missing.status).toBe(404);
  });

  it("blocks VIEWER from creating tickets", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "VIEWER" });

    const response = await request(app)
      .post(`${API_PREFIX}/tickets/`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        subject: "Should not create",
      });

    expect(response.status).toBe(403);
  });
});
