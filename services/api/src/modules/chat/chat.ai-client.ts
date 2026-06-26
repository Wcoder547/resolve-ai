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

type CallRagChatInput = {
  question: string;
  context: string;
  sources: RagChatSource[];
  metadata?: Record<string, unknown>;
};

type RagChatResponse = {
  success: boolean;
  message: string;
  data: {
    answer: string;
    sources: RagChatSource[];
    model: string;
    provider: string;
    grounded: boolean;
    fallbackUsed?: boolean;
    providerErrors?: string[];
    agentPlan?: Record<string, unknown>;
    quality?: Record<string, unknown>;
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
