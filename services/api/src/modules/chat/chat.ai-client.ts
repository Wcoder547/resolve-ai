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
};
};

export async function callAIRagChatService(
  input: CallRagChatInput
): Promise<RagChatResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const response = await fetch(`${aiServiceUrl}/ai/chat/rag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : "AI RAG chat service failed.";

    throw new Error(message);
  }

  return data as RagChatResponse;
}