import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { callAIEmbeddingService } from "./knowledge.embedding-client.js";

type GenerateAndStoreChunkEmbeddingsInput = {
  documentId: string;
  organizationId: string;
};

export function serializeVector(embedding: number[]) {
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function validateEmbeddingDimensions(embedding: number[]) {
  if (embedding.length !== env.EMBEDDING_DIMENSIONS) {
    const error = new Error(
      `Embedding dimension mismatch. Expected ${env.EMBEDDING_DIMENSIONS}, got ${embedding.length}.`
    );

    error.name = "EmbeddingDimensionError";
    throw error;
  }
}

async function updateChunkEmbedding(input: {
  chunkId: string;
  embedding: number[];
  provider: string;
  model: string;
  dimensions: number;
}) {
  validateEmbeddingDimensions(input.embedding);

  const vector = serializeVector(input.embedding);

  await prisma.$executeRaw`
    UPDATE "DocumentChunk"
    SET
      "embedding" = ${vector}::vector,
      "embeddingProvider" = ${input.provider},
      "embeddingModel" = ${input.model},
      "embeddingDimensions" = ${input.dimensions},
      "embeddedAt" = NOW()
    WHERE "id" = ${input.chunkId};
  `;
}

export async function generateQueryEmbedding(text: string) {
  const embeddingResponse = await callAIEmbeddingService([text]);

  const firstEmbedding = embeddingResponse.data.embeddings[0];

  if (!firstEmbedding) {
    const error = new Error("Embedding service returned no query embedding.");
    error.name = "EmbeddingServiceError";
    throw error;
  }

  validateEmbeddingDimensions(firstEmbedding.embedding);

  return {
    embedding: firstEmbedding.embedding,
    provider: embeddingResponse.data.provider,
    model: embeddingResponse.data.model,
    dimensions: embeddingResponse.data.dimensions,
    usage: embeddingResponse.data.usage
  };
}

export async function generateAndStoreChunkEmbeddings(
  input: GenerateAndStoreChunkEmbeddingsInput
) {
  const chunks = await prisma.documentChunk.findMany({
    where: {
      documentId: input.documentId,
      organizationId: input.organizationId
    },
    select: {
      id: true,
      chunkIndex: true,
      chunkText: true
    },
    orderBy: {
      chunkIndex: "asc"
    }
  });

  if (chunks.length === 0) {
    return {
      embeddedChunks: 0,
      provider: null,
      model: null,
      dimensions: null,
      usage: null
    };
  }

  const embeddingResponse = await callAIEmbeddingService(
    chunks.map((chunk) => chunk.chunkText)
  );

  if (embeddingResponse.data.dimensions !== env.EMBEDDING_DIMENSIONS) {
    const error = new Error(
      `Embedding service returned ${embeddingResponse.data.dimensions} dimensions, but Node API expects ${env.EMBEDDING_DIMENSIONS}.`
    );

    error.name = "EmbeddingDimensionError";
    throw error;
  }

  for (const item of embeddingResponse.data.embeddings) {
    const chunk = chunks[item.index];

    if (!chunk) {
      continue;
    }

    await updateChunkEmbedding({
      chunkId: chunk.id,
      embedding: item.embedding,
      provider: embeddingResponse.data.provider,
      model: embeddingResponse.data.model,
      dimensions: embeddingResponse.data.dimensions
    });
  }

  return {
    embeddedChunks: embeddingResponse.data.embeddings.length,
    provider: embeddingResponse.data.provider,
    model: embeddingResponse.data.model,
    dimensions: embeddingResponse.data.dimensions,
    usage: embeddingResponse.data.usage
  };
}