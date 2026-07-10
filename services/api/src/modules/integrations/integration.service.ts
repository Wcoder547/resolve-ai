import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma
} from "@prisma/client";
import { env } from "../../config/env.js";
import { encryptJson, decryptJson } from "../../lib/encryption.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateIntegrationInput } from "./integration.validation.js";
import { assertSafeOutboundUrl } from "../../lib/url-safety.js";

type IntegrationCredentials = {
  webhookUrl?: string;
  secretHeaderName?: string;
  secretHeaderValue?: string;
};

function createDisabledError() {
  const error = new Error("External integrations are currently disabled.");
  error.name = "ForbiddenError";
  return error;
}

function createNotFoundError(message: string) {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw createNotFoundError("No organization found for this user.");
  }

  return membership;
}

export async function createIntegration(
  userId: string,
  input: CreateIntegrationInput
) {
  if (!env.INTEGRATIONS_ENABLED) {
    throw createDisabledError();
  }

  const membership = await getPrimaryMembership(userId);

  await validateIntegrationCredentials({
  provider: input.provider,
  credentials: input.credentials
});

  const integration = await prisma.organizationIntegration.create({
    data: {
      organizationId: membership.organizationId,
      provider: input.provider,
      name: input.name,
      status: input.status,
      config: input.config as Prisma.InputJsonValue,
      encryptedCredentials: encryptJson(input.credentials),
      createdByUserId: userId,
      updatedByUserId: userId
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      organizationId: membership.organizationId,
      action: "INTEGRATION_CREATED",
      metadata: {
        integrationId: integration.id,
        provider: integration.provider,
        name: integration.name
      } as Prisma.InputJsonValue
    }
  });

  return integration;
}

export async function listIntegrations(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const integrations = await prisma.organizationIntegration.findMany({
    where: {
      organizationId: membership.organizationId
    },
    select: {
      id: true,
      provider: true,
      name: true,
      status: true,
      config: true,
      createdByUserId: true,
      updatedByUserId: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return {
    integrations
  };
}

export async function updateIntegrationStatus(input: {
  userId: string;
  integrationId: string;
  status: IntegrationStatus;
}) {
  const membership = await getPrimaryMembership(input.userId);

  const integration = await prisma.organizationIntegration.findFirst({
    where: {
      id: input.integrationId,
      organizationId: membership.organizationId
    }
  });

  if (!integration) {
    throw createNotFoundError("Integration not found.");
  }

  const updated = await prisma.organizationIntegration.update({
    where: {
      id: input.integrationId
    },
    data: {
      status: input.status,
      updatedByUserId: input.userId
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      organizationId: membership.organizationId,
      action: "INTEGRATION_STATUS_UPDATED",
      metadata: {
        integrationId: updated.id,
        provider: updated.provider,
        status: updated.status
      } as Prisma.InputJsonValue
    }
  });

  return updated;
}

export async function deleteIntegration(input: {
  userId: string;
  integrationId: string;
}) {
  const membership = await getPrimaryMembership(input.userId);

  const integration = await prisma.organizationIntegration.findFirst({
    where: {
      id: input.integrationId,
      organizationId: membership.organizationId
    }
  });

  if (!integration) {
    throw createNotFoundError("Integration not found.");
  }

  await prisma.organizationIntegration.delete({
    where: {
      id: input.integrationId
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      organizationId: membership.organizationId,
      action: "INTEGRATION_DELETED",
      metadata: {
        integrationId: integration.id,
        provider: integration.provider,
        name: integration.name
      } as Prisma.InputJsonValue
    }
  });

  return {
    deleted: true
  };
}

export async function getActiveIntegration(input: {
  organizationId: string;
  provider: IntegrationProvider;
}) {
  const integration = await prisma.organizationIntegration.findFirst({
    where: {
      organizationId: input.organizationId,
      provider: input.provider,
      status: "ACTIVE"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!integration) {
    return null;
  }

  return {
    ...integration,
    credentials: decryptJson<IntegrationCredentials>(
      integration.encryptedCredentials
    )
  };
}

export async function recordIntegrationExecution(input: {
  organizationId: string;
  integrationId?: string | null;
  provider: IntegrationProvider;
  toolName: string;
  status: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string | null;
}) {
  return prisma.integrationExecutionLog.create({
    data: {
      organizationId: input.organizationId,
      integrationId: input.integrationId || null,
      provider: input.provider,
      toolName: input.toolName,
      status: input.status,
      request: (input.request || {}) as Prisma.InputJsonValue,
      response: (input.response || {}) as Prisma.InputJsonValue,
      error: input.error || null
    }
  });
}

export async function markIntegrationUsed(integrationId: string) {
  await prisma.organizationIntegration.update({
    where: {
      id: integrationId
    },
    data: {
      lastUsedAt: new Date()
    }
  });
}

function createBadRequestError(message: string) {
  const error = new Error(message);
  error.name = "BadRequestError";
  return error;
}

async function validateIntegrationCredentials(input: {
  provider: IntegrationProvider;
  credentials: Record<string, unknown>;
}) {
  if (
    input.provider === "SLACK_WEBHOOK" ||
    input.provider === "TICKETING_WEBHOOK" ||
    input.provider === "GENERIC_WEBHOOK"
  ) {
    const webhookUrl = input.credentials.webhookUrl;

    if (typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      throw createBadRequestError("webhookUrl is required for this integration.");
    }

    await assertSafeOutboundUrl(webhookUrl);
  }
}