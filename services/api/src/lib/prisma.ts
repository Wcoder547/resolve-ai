import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env, isDevelopment } from "../config/env.js";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: isDevelopment
      ? [
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [{ emit: "stdout", level: "error" }],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}