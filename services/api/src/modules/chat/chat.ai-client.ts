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
    fallbackUsed?: boolean;
    providerErrors?: string[];
    usage: AiUsage;
  };
};

export type RagChatResult = RagChatResponse["data"];

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

export type RagStreamEvent =
  | { type: "token"; text: string }
  | { type: "done"; data: RagChatResponse["data"] }
  | { type: "error"; message: string };

function consumeSseJsonEvents(buffer: string): {
  events: unknown[];
  rest: string;
} {
  const events: unknown[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const dataLines = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) continue;

    const raw = dataLines.join("\n");
    if (!raw || raw === "[DONE]") continue;

    try {
      events.push(JSON.parse(raw));
    } catch {
      // Ignore malformed SSE chunks; the next complete event will parse.
    }
  }

  return { events, rest };
}

export async function* callAIRagChatStream(
  input: CallRagChatInput,
  options?: { signal?: AbortSignal },
): AsyncGenerator<RagStreamEvent> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.AI_CHAT_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/chat/rag/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      signal: controller.signal,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI RAG chat stream failed.";
      throw createAIServiceError(message);
    }

    if (!response.body) {
      throw createAIServiceError("AI RAG chat stream returned an empty body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const consumed = consumeSseJsonEvents(buffer);
      buffer = consumed.rest;

      for (const event of consumed.events) {
        yield event as RagStreamEvent;
      }
    }

    buffer += decoder.decode();
    const remaining = consumeSseJsonEvents(buffer + "\n\n");
    for (const event of remaining.events) {
      yield event as RagStreamEvent;
    }
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

    throw createAIServiceError("Unknown AI service stream error.");
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onAbort);
  }
}
