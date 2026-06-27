import { env } from "../../config/env.js";
import { getEnv } from "../../utils/env.js";

type RagChatSource = {
  sourceId: string;
  sourceName: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
};


type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isEstimated: boolean;
};

type RagCitation = {
  label: string;
  sourceId: string;
  sourceName: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  reason?: string | null;
};

type RagGuardrail = {
  approved: boolean;
  grounded: boolean;
  hasCitations: boolean;
  citationCount: number;
  riskLevel: string;
  unsupportedReason?: string | null;
};

type ChatHistoryMessage = {
  role: string;
  content: string;
  createdAt?: string;
};



type CallRagChatInput = {
  question: string;
  standaloneQuestion?: string;
  context: string;
  sources: RagChatSource[];
  conversationHistory?: ChatHistoryMessage[];
  metadata?: Record<string, unknown>;
};

type RagChatResponse = {
  success: boolean;
  message: string;
  data: {
    answer: string;
    sources: RagChatSource[];
    citations: RagCitation[];
    model: string;
    provider: string;
    grounded: boolean;
    confidence: "low" | "medium" | "high" | string;
    needsEscalation: boolean;
    escalationReason?: string | null;
    guardrails: RagGuardrail;
    promptVersion: string;
    RagChatResponse.data
    fallbackUsed?: boolean;
    providerErrors?: string[];
  };
};

function createAIServiceError(message: string, name = "AIServiceError") {
  const error = new Error(message);
  error.name = name;
  return error;
}

export async function callAIRagChatService(
  input: CallRagChatInput,
): Promise<RagChatResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.AI_CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/chat/rag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(input),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI RAG chat service failed.";

      throw createAIServiceError(message);
    }

    return data as RagChatResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createAIServiceError(
        "AI service request timed out. Please try again.",
        "AIServiceTimeoutError",
      );
    }

    if (error instanceof Error) {
      throw createAIServiceError(error.message);
    }

    throw createAIServiceError("Unknown AI service error.");
  } finally {
    clearTimeout(timeout);
  }
}
