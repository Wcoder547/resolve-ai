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

function formatValidationErrors(errors: unknown): string | null {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  const parts = errors
    .map((error) => {
      if (!error || typeof error !== "object") {
        return null;
      }

      const entry = error as {
        loc?: unknown;
        msg?: unknown;
        message?: unknown;
      };

      const location = Array.isArray(entry.loc)
        ? entry.loc.map(String).join(".")
        : null;
      const detail =
        typeof entry.msg === "string"
          ? entry.msg
          : typeof entry.message === "string"
            ? entry.message
            : null;

      if (location && detail) {
        return `${location}: ${detail}`;
      }

      return detail;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("; ") : null;
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
      const validationErrors =
        data && typeof data === "object"
          ? formatValidationErrors(
              (data as { errors?: unknown }).errors
            )
          : null;

      const baseMessage =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI embedding service failed.";

      throw createEmbeddingError(
        validationErrors
          ? `${baseMessage} ${validationErrors}`
          : baseMessage
      );
    }

    return data as EmbeddingResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createEmbeddingError("AI embedding service timed out.");
    }

    if (error instanceof Error && error.name === "EmbeddingServiceError") {
      throw error;
    }

    if (error instanceof Error) {
      throw createEmbeddingError(error.message);
    }

    throw createEmbeddingError("Unknown embedding service error.");
  } finally {
    clearTimeout(timeout);
  }
}
