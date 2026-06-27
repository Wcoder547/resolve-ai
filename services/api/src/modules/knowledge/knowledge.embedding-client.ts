import { env } from "../../config/env.js";
import { getEnv } from "../../utils/env.js";


type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isEstimated: boolean;
};

type EmbeddingItem = {
  index: number;
  embedding: number[];
};

type EmbeddingResponse = {
  success: boolean;
  message: string;
  data: {
    provider: string;
    model: string;
    usage: AiUsage;
    dimensions: number;
    embeddings: EmbeddingItem[];
  };
};

function createEmbeddingError(message: string) {
  const error = new Error(message);
  error.name = "EmbeddingServiceError";
  return error;
}

export async function callAIEmbeddingService(
  texts: string[]
): Promise<EmbeddingResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.AI_EMBEDDING_TIMEOUT_MS);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        texts
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI embedding service failed.";

      throw createEmbeddingError(message);
    }

    return data as EmbeddingResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createEmbeddingError("AI embedding service timed out.");
    }

    if (error instanceof Error) {
      throw createEmbeddingError(error.message);
    }

    throw createEmbeddingError("Unknown embedding service error.");
  } finally {
    clearTimeout(timeout);
  }
}