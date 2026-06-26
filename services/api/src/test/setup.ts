import { afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma.js";

function ensureTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (!databaseUrl.includes("resolveai_test_db")) {
    throw new Error(
      "Tests must run against resolveai_test_db. Check services/api/.env.test."
    );
  }
}

async function resetTestDatabase() {
  ensureTestDatabase();

  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),

    prisma.documentChunk.deleteMany(),
    prisma.document.deleteMany(),
    prisma.knowledgeSource.deleteMany(),

    prisma.auditLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.organizationMember.deleteMany(),

    prisma.organization.deleteMany(),
    prisma.user.deleteMany()
  ]);
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});