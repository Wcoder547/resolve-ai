import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app.js";

describe("Auth API", () => {
  it("registers, logs in, gets profile, refreshes token, and logs out all sessions", async () => {
   const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = `waseem-${uniqueId}@example.com`;
const organizationName = `ResolveAI Test Org ${uniqueId}`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Waseem Akram",
        email,
        password: "password123",
        organizationName
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.email).toBe(email);
    expect(registerResponse.body.data.tokens.accessToken).toBeTruthy();
    expect(registerResponse.body.data.tokens.refreshToken).toBeTruthy();

    const loginResponse = await request(app).post("/api/auth/login").send({
      email,
      password: "password123"
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

    const oldRefreshReuseResponse = await request(app)
      .post("/api/auth/refresh")
      .send({
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

  it("rejects weak password during register", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Waseem Akram",
      email: "weak-password@example.com",
      password: "123",
      organizationName: "ResolveAI Test Org"
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
});