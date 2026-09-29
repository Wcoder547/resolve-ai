import { AiLlmProvider, Prisma } from "@prisma/client";
import { encryptJson, decryptJson } from "../../lib/encryption.js";
import { prisma } from "../../lib/prisma.js";
import type {
  AiLlmProviderName,
  UpsertAiProviderInput,
} from "./organization-ai-provider.validation.js";

const DEFAULT_MODELS: Record<AiLlmProvider, string> = {
  OPENROUTER: "openrouter/free",
  GROQ: "openai/gpt-oss-20b",
  GEMINI: "gemini-2.0-flash",
};

function createError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function lastFour(apiKey: string) {
  return apiKey.slice(-4);
}

function serializeProvider(row: {
  id: string;
  provider: AiLlmProvider;
  keyLastFour: string;
  model: string;
  isDefault: boolean;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    provider: row.provider,
    connected: true,
    keyMasked: `••••••••${row.keyLastFour}`,
    model: row.model,
    isDefault: row.isDefault,
    lastTestedAt: row.lastTestedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listKnownAiProviders() {
  return (Object.keys(DEFAULT_MODELS) as AiLlmProvider[]).map((provider) => ({
    provider,
    defaultModel: DEFAULT_MODELS[provider],
  }));
}

export async function listOrganizationAiProviders(organizationId: string) {
  const rows = await prisma.organizationAiProvider.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return (Object.keys(DEFAULT_MODELS) as AiLlmProvider[]).map((provider) => {
    const row = byProvider.get(provider);
    if (!row) {
      return {
        id: null,
        provider,
        connected: false,
        keyMasked: null,
        model: DEFAULT_MODELS[provider],
        isDefault: false,
        lastTestedAt: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    return serializeProvider(row);
  });
}

export async function upsertOrganizationAiProvider(
  actorUserId: string,
  organizationId: string,
  provider: AiLlmProviderName,
  input: UpsertAiProviderInput,
) {
  const existing = await prisma.organizationAiProvider.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider,
      },
    },
  });

  if (!existing && !input.apiKey) {
    throw createError("BadRequestError", "An API key is required to connect this provider.");
  }

  const count = await prisma.organizationAiProvider.count({
    where: { organizationId },
  });

  const model = input.model || existing?.model || DEFAULT_MODELS[provider];
  const makeDefault = !existing && count === 0;

  const data = {
    model,
    ...(input.apiKey
      ? {
          encryptedApiKey: encryptJson({ apiKey: input.apiKey }),
          keyLastFour: lastFour(input.apiKey),
        }
      : {}),
    ...(makeDefault ? { isDefault: true } : {}),
  };

  const saved = existing
    ? await prisma.organizationAiProvider.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.organizationAiProvider.create({
        data: {
          organizationId,
          provider,
          encryptedApiKey: data.encryptedApiKey as string,
          keyLastFour: data.keyLastFour as string,
          model,
          isDefault: makeDefault,
        },
      });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: existing ? "AI_PROVIDER_UPDATED" : "AI_PROVIDER_CONNECTED",
      metadata: {
        provider,
        model: saved.model,
        keyLastFour: saved.keyLastFour,
      } as Prisma.InputJsonValue,
    },
  });

  return serializeProvider(saved);
}

export async function setDefaultOrganizationAiProvider(
  actorUserId: string,
  organizationId: string,
  provider: AiLlmProviderName,
) {
  const target = await prisma.organizationAiProvider.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider,
      },
    },
  });

  if (!target) {
    throw createError("NotFoundError", "Connect this provider before making it the default.");
  }

  await prisma.$transaction([
    prisma.organizationAiProvider.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.organizationAiProvider.update({
      where: { id: target.id },
      data: { isDefault: true },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "AI_PROVIDER_DEFAULT_SET",
      metadata: { provider } as Prisma.InputJsonValue,
    },
  });

  return listOrganizationAiProviders(organizationId);
}

export async function deleteOrganizationAiProvider(
  actorUserId: string,
  organizationId: string,
  provider: AiLlmProviderName,
) {
  const existing = await prisma.organizationAiProvider.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider,
      },
    },
  });

  if (!existing) {
    throw createError("NotFoundError", "Provider is not connected.");
  }

  await prisma.organizationAiProvider.delete({
    where: { id: existing.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "AI_PROVIDER_DISCONNECTED",
      metadata: { provider } as Prisma.InputJsonValue,
    },
  });

  return true;
}

export async function testOrganizationAiProvider(
  actorUserId: string,
  organizationId: string,
  provider: AiLlmProviderName,
) {
  const existing = await prisma.organizationAiProvider.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider,
      },
    },
  });

  if (!existing) {
    throw createError("NotFoundError", "Connect this provider before testing it.");
  }

  let payload: { apiKey?: string };
  try {
    payload = decryptJson<{ apiKey?: string }>(existing.encryptedApiKey);
  } catch {
    throw createError("BadRequestError", "Stored API key could not be decrypted.");
  }

  const apiKey = payload.apiKey?.trim() || "";
  if (apiKey.length < 16) {
    throw createError("BadRequestError", "Stored API key is invalid.");
  }

  const updated = await prisma.organizationAiProvider.update({
    where: { id: existing.id },
    data: { lastTestedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "AI_PROVIDER_TESTED",
      metadata: {
        provider,
        ok: true,
      } as Prisma.InputJsonValue,
    },
  });

  return serializeProvider(updated);
}
