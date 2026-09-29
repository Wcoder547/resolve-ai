export type AiLlmProvider = "OPENROUTER" | "GROQ" | "GEMINI";

export type OrganizationAiProvider = {
  id: string | null;
  provider: AiLlmProvider;
  connected: boolean;
  keyMasked: string | null;
  model: string;
  isDefault: boolean;
  lastTestedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ListAiProvidersResponse = {
  success: boolean;
  data: {
    providers: OrganizationAiProvider[];
  };
};

export type UpsertAiProviderResponse = {
  success: boolean;
  message: string;
  data: {
    provider: OrganizationAiProvider;
  };
};

export type SetDefaultAiProviderResponse = {
  success: boolean;
  message: string;
  data: {
    providers: OrganizationAiProvider[];
  };
};

export type NotificationPreference = {
  eventKey: string;
  label: string;
  emailEnabled: boolean;
  slackEnabled: boolean;
};

export type NotificationPreferencesResponse = {
  success: boolean;
  message?: string;
  data: {
    preferences: NotificationPreference[];
  };
};
