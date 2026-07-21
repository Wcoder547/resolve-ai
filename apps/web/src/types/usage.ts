export type AiUsagePeriod = {
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiUsageSummary = {
  daily: AiUsagePeriod & {
    date: string;
    limits: {
      requestLimit: number;
      tokenLimit: number;
    };
  };
  monthly: AiUsagePeriod & {
    monthStart: string;
    limits: {
      tokenLimit: number;
    };
  };
};

export type AiUsageSummaryResponse = {
  success: boolean;
  message: string;
  data: AiUsageSummary;
};

export type AiUsageEvent = {
  id: string;
  organizationId: string;
  userId: string | null;
  conversationId: string | null;
  messageId: string | null;
  operation: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  isEstimated: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ListAiUsageEventsResponse = {
  success: boolean;
  message: string;
  data: {
    events: AiUsageEvent[];
  };
};