import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app.js";

describe("Health API", () => {
  it("returns API health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "node-api",
      environment: "test"
    });
  });

  it("returns 404 for unknown route", async () => {
    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Route not found");
  });
});