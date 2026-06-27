import request from "supertest";
import { UserRole } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";

export function createTestEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}@example.com`;
}

export async function registerAndLoginTestUser(input?: {
  role?: UserRole;
  email?: string;
}) {
  const email = input?.email || createTestEmail();
  const password = "Password123";

  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email,
      password,
      organizationName: "Test Organization"
    });

  if (registerResponse.status !== 201 && registerResponse.status !== 200) {
    throw new Error(
      `Register failed: ${registerResponse.status} ${JSON.stringify(
        registerResponse.body
      )}`
    );
  }

  const loginResponse = await request(app).post("/api/auth/login").send({
    email,
    password
  });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Login failed: ${loginResponse.status} ${JSON.stringify(
        loginResponse.body
      )}`
    );
  }

  const accessToken = loginResponse.body.data.tokens.accessToken;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email
    }
  });

  const membership = await prisma.organizationMember.findFirstOrThrow({
    where: {
      userId: user.id
    }
  });

  if (input?.role) {
    await prisma.organizationMember.update({
      where: {
        id: membership.id
      },
      data: {
        role: input.role
      }
    });
  }

  const updatedMembership = await prisma.organizationMember.findFirstOrThrow({
    where: {
      userId: user.id
    }
  });

  return {
    email,
    password,
    accessToken,
    user,
    membership: updatedMembership
  };
}