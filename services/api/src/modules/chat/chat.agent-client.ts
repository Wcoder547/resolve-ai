import { env } from "../../config/env.js";
import { getEnv } from "../../utils/env.js";
import type { ChatHistoryMessage } from "./chat.context-client.js";

type AgentSource = {
  sourceId: string;
  sourceName: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
};

type AgentCitation = {
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

export type AgentStep = {
  agentName: string;
  status: string;
  provider?: string | null;
  model?: string | null;
  latencyMs: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string | null;
};

type CallAgenticResolveInput = {
  question: string;
  standaloneQuestion?: string;
  context: string;
  sources: AgentSource[];
  conversationHistory?: ChatHistoryMessage[];
  metadata?: Record<string, unknown>;
};

export type AgenticResolveResponse = {
  success: boolean;
  message: string;
  data: {
    answer: string;
    agentRunId: string;
    status: string;
    agentsUsed: string[];
    steps: AgentStep[];
    toolCalls: AgentToolCall[];

    sources: AgentSource[];
    citations: AgentCitation[];

    triage: Record<string, unknown>;
    retrievalReview: Record<string, unknown>;
    diagnostic: Record<string, unknown>;
    resolution: Record<string, unknown>;
    qa: Record<string, unknown>;

    grounded: boolean;
    confidence: string;
    needsEscalation: boolean;
    escalationReason?: string | null;

    provider: string;
    model: string;
    promptVersion: string;
    fallbackUsed?: boolean;
    providerErrors?: string[];
  };
};

export type AgentToolCall = {
  toolCallId: string;
  toolName: string;
  status: string;
  reason?: string | null;
  latencyMs: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string | null;
};

function createAgenticServiceError(message: string, name = "AgenticServiceError") {
  const error = new Error(message);
  error.name = name;
  return error;
}

export async function callAIAgenticResolveService(
  input: CallAgenticResolveInput
): Promise<AgenticResolveResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.AGENTIC_CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/agents/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify(input)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "AI agentic resolve service failed.";

      throw createAgenticServiceError(message);
    }

    return data as AgenticResolveResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createAgenticServiceError(
        "Agentic AI service request timed out. Please try again.",
        "AgenticServiceTimeoutError"
      );
    }

    if (error instanceof Error) {
      throw createAgenticServiceError(error.message);
    }

    throw createAgenticServiceError("Unknown agentic AI service error.");
  } finally {
    clearTimeout(timeout);
  }
}

