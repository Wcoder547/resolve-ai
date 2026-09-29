import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../app.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { createSecureToken, hashSecureToken } from "../../lib/secure-token.js";
import {
  API_PREFIX,
  createTestEmail,
  markUserEmailVerified,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";
import * as emailService from "../email/email.service.js";
import { createEmailVerificationToken } from "./email-verification.service.js";

describe("Auth email and password security flows", () => {
  const originalEmailVerificationEnabled = env.EMAIL_VERIFICATION_ENABLED;

  beforeEach(() => {
    env.EMAIL_VERIFICATION_ENABLED = true;
  });

  afterEach(() => {
    env.EMAIL_VERIFICATION_ENABLED = originalEmailVerificationEnabled;
    vi.restoreAllMocks();
  });

  it("accepts forgot-password for known and unknown emails without leaking existence", async () => {
    const { email } = await registerAndLoginTestUser();

    vi.spyOn(emailService, "sendPasswordResetEmail").mockResolvedValue({
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    });

    const known = await request(app)
      .post(`${API_PREFIX}/auth/forgot-password`)
      .send({ email });

    const unknown = await request(app)
      .post(`${API_PREFIX}/auth/forgot-password`)
      .send({ email: createTestEmail("missing") });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.message).toMatch(/if an account exists/i);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { usedAt: null },
    });
    expect(tokens.length).toBe(1);
  });

  it("resets password with a valid token and rejects invalid tokens", async () => {
    const { email, user } = await registerAndLoginTestUser();
    const token = createSecureToken(32);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashSecureToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const reset = await request(app)
      .post(`${API_PREFIX}/auth/reset-password`)
      .send({
        token,
        password: "NewPassword123",
      });

    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);

    const loginOld = await request(app).post(`${API_PREFIX}/auth/login`).send({
      email,
      password: "Password123",
    });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post(`${API_PREFIX}/auth/login`).send({
      email,
      password: "NewPassword123",
    });
    expect(loginNew.status).toBe(200);

    const invalid = await request(app)
      .post(`${API_PREFIX}/auth/reset-password`)
      .send({
        token: createSecureToken(32),
        password: "AnotherPass123",
      });
    expect(invalid.status).toBe(400);
  });

  it("verifies email via query and body, and rejects invalid tokens", async () => {
    const email = createTestEmail("verify");
    await request(app).post(`${API_PREFIX}/auth/register`).send({
      name: "Verify User",
      email,
      password: "Password123",
      organizationName: "Verify Org",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const { token } = await createEmailVerificationToken(user.id);

    const byQuery = await request(app).get(
      `${API_PREFIX}/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
    expect(byQuery.status).toBe(200);
    expect(byQuery.body.data.verified).toBe(true);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(refreshed.emailVerifiedAt).toBeTruthy();

    const invalid = await request(app)
      .post(`${API_PREFIX}/auth/verify-email`)
      .send({ token: createSecureToken(32) });
    expect(invalid.status).toBe(400);

    const email2 = createTestEmail("verify-body");
    await request(app).post(`${API_PREFIX}/auth/register`).send({
      name: "Verify Body",
      email: email2,
      password: "Password123",
      organizationName: "Verify Body Org",
    });
    const user2 = await prisma.user.findUniqueOrThrow({ where: { email: email2 } });
    const { token: token2 } = await createEmailVerificationToken(user2.id);

    const byBody = await request(app)
      .post(`${API_PREFIX}/auth/verify-email`)
      .send({ token: token2 });
    expect(byBody.status).toBe(200);
    expect(byBody.body.data.verified).toBe(true);
  });

  it("resends verification safely for unverified and unknown emails", async () => {
    const email = createTestEmail("resend");
    await request(app).post(`${API_PREFIX}/auth/register`).send({
      name: "Resend User",
      email,
      password: "Password123",
      organizationName: "Resend Org",
    });

    vi.spyOn(emailService, "sendVerificationEmail").mockResolvedValue({
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    });

    const resend = await request(app)
      .post(`${API_PREFIX}/auth/resend-verification`)
      .send({ email });

    expect(resend.status).toBe(200);
    expect(resend.body.message).toMatch(/if an account exists/i);

    const tokens = await prisma.emailVerificationToken.findMany({
      where: { usedAt: null },
    });
    expect(tokens.length).toBeGreaterThanOrEqual(1);

    const unknown = await request(app)
      .post(`${API_PREFIX}/auth/resend-verification`)
      .send({ email: createTestEmail("ghost") });

    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(resend.body.message);
  });

  it("changes password when verified and blocks when email is unverified", async () => {
    const verified = await registerAndLoginTestUser();

    const change = await request(app)
      .post(`${API_PREFIX}/auth/change-password`)
      .set("Authorization", `Bearer ${verified.accessToken}`)
      .send({
        currentPassword: verified.password,
        newPassword: "ChangedPass123",
      });

    expect(change.status).toBe(200);
    expect(change.body.data.tokens.accessToken).toBeTruthy();

    const email = createTestEmail("unverified-change");
    const register = await request(app).post(`${API_PREFIX}/auth/register`).send({
      name: "Unverified",
      email,
      password: "Password123",
      organizationName: "Unverified Org",
    });

    const blocked = await request(app)
      .post(`${API_PREFIX}/auth/change-password`)
      .set(
        "Authorization",
        `Bearer ${register.body.data.tokens.accessToken}`,
      )
      .send({
        currentPassword: "Password123",
        newPassword: "ChangedPass123",
      });

    expect(blocked.status).toBe(403);
    expect(blocked.body.code || blocked.body.message).toBeTruthy();
  });

  it("lists sessions, revokes one, revokes others, and logs out a single session", async () => {
    const email = createTestEmail("sessions");
    const password = "Password123";

    await request(app).post(`${API_PREFIX}/auth/register`).send({
      name: "Session User",
      email,
      password,
      organizationName: "Session Org",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await markUserEmailVerified(user.id);

    const firstLogin = await request(app).post(`${API_PREFIX}/auth/login`).send({
      email,
      password,
    });
    const secondLogin = await request(app).post(`${API_PREFIX}/auth/login`).send({
      email,
      password,
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);

    const accessToken = secondLogin.body.data.tokens.accessToken as string;
    const refreshToken = secondLogin.body.data.tokens.refreshToken as string;
    const firstRefresh = firstLogin.body.data.tokens.refreshToken as string;

    const sessions = await request(app)
      .get(`${API_PREFIX}/auth/sessions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-refresh-token", refreshToken);

    expect(sessions.status).toBe(200);
    expect(sessions.body.data.sessions.length).toBeGreaterThanOrEqual(2);

    const otherSession = sessions.body.data.sessions.find(
      (session: { current?: boolean }) => !session.current,
    );
    expect(otherSession).toBeTruthy();

    const revokeOne = await request(app)
      .delete(`${API_PREFIX}/auth/sessions/${otherSession.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(revokeOne.status).toBe(200);

    const thirdLogin = await request(app).post(`${API_PREFIX}/auth/login`).send({
      email,
      password,
    });
    const thirdAccess = thirdLogin.body.data.tokens.accessToken as string;
    const thirdRefresh = thirdLogin.body.data.tokens.refreshToken as string;

    const revokeOthers = await request(app)
      .post(`${API_PREFIX}/auth/sessions/revoke-others`)
      .set("Authorization", `Bearer ${thirdAccess}`)
      .send({ refreshToken: thirdRefresh });

    expect(revokeOthers.status).toBe(200);

    const reuseFirst = await request(app).post(`${API_PREFIX}/auth/refresh`).send({
      refreshToken: firstRefresh,
    });
    expect(reuseFirst.status).toBe(401);

    const logout = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Authorization", `Bearer ${thirdAccess}`)
      .send({ refreshToken: thirdRefresh });

    expect(logout.status).toBe(200);

    const afterLogout = await request(app).post(`${API_PREFIX}/auth/refresh`).send({
      refreshToken: thirdRefresh,
    });
    expect(afterLogout.status).toBe(401);
  });
});
