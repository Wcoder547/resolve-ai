import request from "supertest";
import { UserRole } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";

export const API_PREFIX = "/api/v1";

export function createTestEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}@example.com`;
}

export async function markUserEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
}

export async function registerAndLoginTestUser(input?: {
  role?: UserRole;
  email?: string;
  verifyEmail?: boolean;
}) {
  const email = input?.email || createTestEmail();
  const password = "Password123";
  const verifyEmail = input?.verifyEmail !== false;

  const registerResponse = await request(app)
    .post(`${API_PREFIX}/auth/register`)
    .send({
      name: "Test User",
      email,
      password,
      organizationName: "Test Organization",
    });

  if (registerResponse.status !== 201 && registerResponse.status !== 200) {
    throw new Error(
      `Register failed: ${registerResponse.status} ${JSON.stringify(
        registerResponse.body,
      )}`,
    );
  }

  let user = await prisma.user.findUniqueOrThrow({
    where: { email },
  });

  if (verifyEmail && !user.emailVerifiedAt) {
    user = await markUserEmailVerified(user.id);
  }

  const loginResponse = await request(app)
    .post(`${API_PREFIX}/auth/login`)
    .send({
      email,
      password,
    });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Login failed: ${loginResponse.status} ${JSON.stringify(
        loginResponse.body,
      )}`,
    );
  }

  const accessToken = loginResponse.body.data.tokens.accessToken as string;
  const refreshToken = loginResponse.body.data.tokens.refreshToken as string;

  const membership = await prisma.organizationMember.findFirstOrThrow({
    where: {
      userId: user.id,
    },
  });

  if (input?.role) {
    await prisma.organizationMember.update({
      where: {
        id: membership.id,
      },
      data: {
        role: input.role,
      },
    });
  }

  const updatedMembership = await prisma.organizationMember.findFirstOrThrow({
    where: {
      userId: user.id,
    },
  });

  return {
    email,
    password,
    accessToken,
    refreshToken,
    user: await prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    membership: updatedMembership,
  };
}
