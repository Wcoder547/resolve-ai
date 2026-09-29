import { prisma } from "../../lib/prisma.js";

function createError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function sanitizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata ?? null;
  }

  const blocked = new Set([
    "token",
    "tokenHash",
    "password",
    "passwordHash",
    "refreshToken",
    "accessToken",
    "inviteUrl",
    "resetUrl",
    "verificationUrl",
    "apiKey",
    "encryptedApiKey",
  ]);

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).filter(
      ([key]) => !blocked.has(key),
    ),
  );
}

export async function listOrganizationAuditLogs(
  organizationId: string,
  input: { limit?: number; action?: string } = {},
) {
  const limit = Math.min(Math.max(input.limit || 50, 1), 100);

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(input.action
        ? {
            action: input.action.trim(),
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    metadata: sanitizeMetadata(log.metadata),
    createdAt: log.createdAt,
    user: log.user,
  }));
}
