import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "../config/env.js";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: isDevelopment
      ? [
          {
            emit: "stdout",
            level: "warn",
          },
          {
            emit: "stdout",
            level: "error",
          },
        ]
      : [
          {
            emit: "stdout",
            level: "error",
          },
        ],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}