import { getEnv } from "../../utils/env.js";

type FastAPIChunk = {
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
};

type FastAPIIngestResponse = {
  success: boolean;
  message: string;
  data: {
    sourceId: string;
    documentId: string;
    organizationId: string;
    textLength: number;
    chunksCount: number;
    chunks: FastAPIChunk[];
  };
};

type CallIngestionServiceInput = {
  sourceId: string;
  documentId: string;
  organizationId: string;
  filePath?: string;
  fileUrl?: string;
  mimeType?: string | null;
  metadata?: Record<string, unknown>;
};

export async function callAIIngestionService(
  input: CallIngestionServiceInput
): Promise<FastAPIIngestResponse> {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const response = await fetch(`${aiServiceUrl}/ai/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceId: input.sourceId,
      documentId: input.documentId,
      organizationId: input.organizationId,
      filePath: input.filePath,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      metadata: input.metadata || {}
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : typeof data.message === "string"
          ? data.message
          : "AI ingestion service failed.";

    throw new Error(message);
  }

  return data as FastAPIIngestResponse;
}