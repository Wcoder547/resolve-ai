export type IntegrationProvider =
  | "SLACK_WEBHOOK"
  | "TICKETING_WEBHOOK"
  | "GENERIC_WEBHOOK";

export type IntegrationStatus = "ACTIVE" | "DISABLED";

// The list endpoint selects a fixed set of columns and never returns
// credentials (encrypted or otherwise) — see integration.service.ts#listIntegrations.
export type Integration = {
  id: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  config: Record<string, unknown> | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListIntegrationsResponse = {
  success: boolean;
  message: string;
  data: {
    integrations: Integration[];
  };
};

export type CreateIntegrationPayload = {
  provider: IntegrationProvider;
  name: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  // Only `webhookUrl` is validated server-side today for all three
  // providers (see integration.service.ts#validateIntegrationCredentials).
  credentials: {
    webhookUrl: string;
    secretHeaderName?: string;
    secretHeaderValue?: string;
  };
};

export type CreateIntegrationResponse = {
  success: boolean;
  message: string;
  data: {
    // The create endpoint returns the raw Prisma row, which includes
    // `encryptedCredentials` (ciphertext, never plaintext) — typed loosely
    // here since the UI only reads the fields also present in `Integration`.
    integration: Integration & { encryptedCredentials?: string };
  };
};

export type UpdateIntegrationStatusResponse = {
  success: boolean;
  message: string;
  data: {
    integration: Integration & { encryptedCredentials?: string };
  };
};

export type DeleteIntegrationResponse = {
  success: boolean;
  message: string;
  data: {
    deleted: boolean;
  };
};