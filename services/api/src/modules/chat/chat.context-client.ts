import { env } from "../../config/env.js";
import { getEnv } from "../../utils/env.js";



type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isEstimated: boolean;
};

export type ChatHistoryMessage = {
  role: string;
  content: string;
  createdAt?: string;
};

type QuestionRewriteResponse = {
  success: boolean;
  message: string;
  data: {
    standaloneQuestion: string;
    wasFollowUp: boolean;
    confidence: "low" | "medium" | "high" | string;
    provider: string;
    model: string;
    promptVersion: string;
    usage: AiUsage;
    fallbackUsed: boolean;
    providerErrors: string[];
  };
};

function createQuestionRewriteError(message: string) {
  const error = new Error(message);
  error.name = "QuestionRewriteError";
  return error;
}

export async function callAIQuestionRewriteService(input: {
  question: string;
  conversationHistory: ChatHistoryMessage[];
  metadata?: Record<string, unknown>;
}): Promise<QuestionRewriteResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.QUESTION_REWRITE_TIMEOUT_MS);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/chat/rewrite-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        question: input.question,
        conversationHistory: input.conversationHistory,
        metadata: input.metadata || {}
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI question rewrite service failed.";

      throw createQuestionRewriteError(message);
    }

    return data as QuestionRewriteResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createQuestionRewriteError("AI question rewrite service timed out.");
    }

    if (error instanceof Error) {
      throw createQuestionRewriteError(error.message);
    }

    throw createQuestionRewriteError("Unknown question rewrite service error.");
  } finally {
    clearTimeout(timeout);
  }
}