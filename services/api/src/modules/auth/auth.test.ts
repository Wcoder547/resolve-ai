import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createTestEmail } from "../../test/test-helpers.js";

describe("Auth API", () => {
  it("registers a user with an organization", async () => {
    const email = createTestEmail("register");

    const response = await request(app).post("/api/auth/register").send({
      name: "Waseem Test",
      email,
      password: "Password123",
      organizationName: "ResolveAI Test Org"
    });

    expect([200, 201]).toContain(response.status);
    expect(response.body.success).toBe(true);

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      include: {
        memberships: true
      }
    });

    expect(user).toBeTruthy();
    expect(user?.memberships.length).toBe(1);
  });

  it("logs in and returns access and refresh tokens", async () => {
    const email = createTestEmail("login");
    const password = "Password123";

    await request(app).post("/api/auth/register").send({
      name: "Login Test",
      email,
      password,
      organizationName: "Login Test Org"
    });

    const response = await request(app).post("/api/auth/login").send({
      email,
      password
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokens.accessToken).toBeTruthy();
    expect(response.body.data.tokens.refreshToken).toBeTruthy();
  });

  it("rejects weak password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Weak Password",
      email: createTestEmail("weak"),
      password: "123",
      organizationName: "Weak Password Org"
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
  });
});