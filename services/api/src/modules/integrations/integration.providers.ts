import { IntegrationProvider } from "@prisma/client";
import { postJsonWithTimeout } from "./integration.http.js";
import {
  getActiveIntegration,
  markIntegrationUsed,
  recordIntegrationExecution
} from "./integration.service.js";

type ExecuteExternalToolInput = {
  organizationId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function createConflictError(message: string) {
  const error = new Error(message);
  error.name = "ConflictError";
  return error;
}

function getWebhookHeaders(credentials: {
  secretHeaderName?: string;
  secretHeaderValue?: string;
}) {
  if (!credentials.secretHeaderName || !credentials.secretHeaderValue) {
    return {};
  }

  return {
    [credentials.secretHeaderName]: credentials.secretHeaderValue
  };
}

export async function executeSlackWebhook(input: ExecuteExternalToolInput) {
  const integration = await getActiveIntegration({
    organizationId: input.organizationId,
    provider: "SLACK_WEBHOOK"
  });

  if (!integration?.credentials.webhookUrl) {
    throw createConflictError("No active Slack webhook integration found.");
  }

  const text =
    typeof input.toolInput.message === "string"
      ? input.toolInput.message
      : typeof input.toolInput.summary === "string"
        ? input.toolInput.summary
        : "ResolveAI escalation notification";

  const payload = {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*ResolveAI Escalation*\n${text}`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Tool*\n${input.toolName}`
          },
          {
            type: "mrkdwn",
            text: `*Source*\nResolveAI`
          }
        ]
      }
    ]
  };

  try {
    const response = await postJsonWithTimeout({
      url: integration.credentials.webhookUrl,
      payload,
      headers: getWebhookHeaders(integration.credentials)
    });

    await markIntegrationUsed(integration.id);

    await recordIntegrationExecution({
      organizationId: input.organizationId,
      integrationId: integration.id,
      provider: "SLACK_WEBHOOK",
      toolName: input.toolName,
      status: "completed",
      request: {
        payload,
        metadata: input.metadata || {}
      },
      response: response as Record<string, unknown>
    });

    return {
      integrationProvider: "SLACK_WEBHOOK" as IntegrationProvider,
      integrationId: integration.id,
      externalWritePerformed: true,
      response
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Slack webhook error.";

    await recordIntegrationExecution({
      organizationId: input.organizationId,
      integrationId: integration.id,
      provider: "SLACK_WEBHOOK",
      toolName: input.toolName,
      status: "failed",
      request: {
        input: input.toolInput,
        metadata: input.metadata || {}
      },
      error: errorMessage
    });

    throw error;
  }
}

export async function executeTicketingWebhook(input: ExecuteExternalToolInput) {
  const integration = await getActiveIntegration({
    organizationId: input.organizationId,
    provider: "TICKETING_WEBHOOK"
  });

  if (!integration?.credentials.webhookUrl) {
    throw createConflictError("No active ticketing webhook integration found.");
  }

  const title =
    typeof input.toolInput.title === "string"
      ? input.toolInput.title
      : "ResolveAI support ticket";

  const summary =
    typeof input.toolInput.summary === "string"
      ? input.toolInput.summary
      : "No summary provided.";

  const priority =
    typeof input.toolInput.priority === "string"
      ? input.toolInput.priority
      : "medium";

  const payload = {
    eventType: "resolveai.support_ticket.create",
    title,
    summary,
    priority,
    source: "resolveai",
    toolName: input.toolName,
    metadata: input.metadata || {}
  };

  try {
    const response = await postJsonWithTimeout({
      url: integration.credentials.webhookUrl,
      payload,
      headers: getWebhookHeaders(integration.credentials)
    });

    await markIntegrationUsed(integration.id);

    await recordIntegrationExecution({
      organizationId: input.organizationId,
      integrationId: integration.id,
      provider: "TICKETING_WEBHOOK",
      toolName: input.toolName,
      status: "completed",
      request: {
        payload,
        metadata: input.metadata || {}
      },
      response: response as Record<string, unknown>
    });

    return {
      integrationProvider: "TICKETING_WEBHOOK" as IntegrationProvider,
      integrationId: integration.id,
      externalWritePerformed: true,
      response
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown ticketing webhook error.";

    await recordIntegrationExecution({
      organizationId: input.organizationId,
      integrationId: integration.id,
      provider: "TICKETING_WEBHOOK",
      toolName: input.toolName,
      status: "failed",
      request: {
        input: input.toolInput,
        metadata: input.metadata || {}
      },
      error: errorMessage
    });

    throw error;
  }
}