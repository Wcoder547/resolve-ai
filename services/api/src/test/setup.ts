import { afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma.js";

export async function clearTestDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AiUsageEvent",
      "OrganizationAiUsageDaily",
      "Message",
      "Conversation",
      "DocumentChunk",
      "Document",
      "KnowledgeSource",
      "AuditLog",
      "RefreshToken",
      "OrganizationMember",
      "Organization",
      "User"
    RESTART IDENTITY CASCADE;
  `);
}

beforeEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});