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
      where: { email },
      include: { memberships: true }
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

  it("rejects weak password during register", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Weak Password",
      email: createTestEmail("weak"),
      password: "123",
      organizationName: "Weak Password Org"
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed.");
  });

  it("rejects invalid login safely", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "password123"
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password.");
  });

  it("gets profile, refreshes token, rejects reused refresh token, and logs out all sessions", async () => {
    const email = createTestEmail("lifecycle");
    const password = "Password123";
    const organizationName = "ResolveAI Lifecycle Org";

    const registerResponse = await request(app).post("/api/auth/register").send({
      name: "Waseem Akram",
      email,
      password,
      organizationName
    });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.email).toBe(email);
    expect(registerResponse.body.data.tokens.accessToken).toBeTruthy();
    expect(registerResponse.body.data.tokens.refreshToken).toBeTruthy();

    const loginResponse = await request(app).post("/api/auth/login").send({
      email,
      password
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    const accessToken = loginResponse.body.data.tokens.accessToken;
    const refreshToken = loginResponse.body.data.tokens.refreshToken;

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.user.email).toBe(email);
    expect(meResponse.body.data.organizations.length).toBeGreaterThan(0);

    const refreshResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken
    });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);

    const newAccessToken = refreshResponse.body.data.tokens.accessToken;
    const newRefreshToken = refreshResponse.body.data.tokens.refreshToken;
    expect(newAccessToken).toBeTruthy();
    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(refreshToken);

    const oldRefreshReuseResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken
    });
    expect(oldRefreshReuseResponse.status).toBe(401);
    expect(oldRefreshReuseResponse.body.success).toBe(false);

    const logoutAllResponse = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${newAccessToken}`);
    expect(logoutAllResponse.status).toBe(200);
    expect(logoutAllResponse.body.success).toBe(true);
  });
});