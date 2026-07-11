import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { callAIIngestionService } from "./knowledge.ingestion.js";
import type { SearchKnowledgeInput } from "./knowledge.validation.js";
import {
  createFileHash,
  removeFileQuietly,
  sanitizeFileName,
  validateKnowledgeUpload,
} from "./knowledge.file-utils.js";

import { recordAiUsage } from "../usage/usage.service.js";

import {
  deleteKnowledgeFileFromStorage,
  getKnowledgeFileAccess,
  saveKnowledgeFileToStorage,
} from "../storage/storage.service.js";
import type { StoredFileReference } from "../storage/storage.types.js";
import {
  generateAndStoreChunkEmbeddings,
  generateQueryEmbedding,
  serializeVector,
} from "./knowledge.embedding.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

type UploadKnowledgeSourceInput = {
  userId: string;
  file: Express.Multer.File;
  name?: string;
};

type JsonObject = Record<string, unknown>;

function createAppError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function toJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  return {};
}

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    throw createAppError(
      "NotFoundError",
      "No organization found for this user.",
    );
  }

  return membership;
}

export async function uploadKnowledgeSource({
  userId,
  file,
  name,
}: UploadKnowledgeSourceInput) {
  const membership = await getPrimaryMembership(userId);

  let storedFileForCleanup: StoredFileReference | null = null;

  try {
    await validateKnowledgeUpload(file);

    const fileHash = await createFileHash(file.path);

    const existingDocument = await prisma.document.findFirst({
      where: {
        organizationId: membership.organizationId,
        contentHash: fileHash,
      },
      include: {
        source: true,
      },
    });

    if (existingDocument) {
      throw createAppError(
        "ConflictError",
        "This document already exists in your knowledge base.",
      );
    }

    const storedFile = await saveKnowledgeFileToStorage({
      file,
      organizationId: membership.organizationId,
    });

    storedFileForCleanup = {
      storageProvider: storedFile.provider,
      filePath: storedFile.filePath,
      storageKey: storedFile.storageKey,
      storageBucket: storedFile.storageBucket,
      storageRegion: storedFile.storageRegion,
    };

    const safeOriginalName = sanitizeFileName(file.originalname);
    const sourceName = name?.trim() || safeOriginalName;

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.knowledgeSource.create({
        data: {
          organizationId: membership.organizationId,
          createdByUserId: userId,
          type: "FILE",
          name: sourceName,
          status: "PENDING",
          filePath: storedFile.filePath,
          storageProvider: storedFile.provider,
          storageKey: storedFile.storageKey,
          storageBucket: storedFile.storageBucket,
          storageRegion: storedFile.storageRegion,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          metadata: {
            originalName: file.originalname,
            safeOriginalName,
            storageProvider: storedFile.provider,
            storageKey: storedFile.storageKey,
            storageBucket: storedFile.storageBucket,
            storageRegion: storedFile.storageRegion,
            encoding: file.encoding,
            uploadHardeningVersion: "phase-4.5-r2",
          } as Prisma.InputJsonValue,
        },
      });

      const document = await tx.document.create({
        data: {
          organizationId: membership.organizationId,
          sourceId: source.id,
          title: sourceName,
          contentHash: fileHash,
          metadata: {
            originalName: file.originalname,
            safeOriginalName,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            storageProvider: storedFile.provider,
            storageKey: storedFile.storageKey,
            storageBucket: storedFile.storageBucket,
            storageRegion: storedFile.storageRegion,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: membership.organizationId,
          action: "KNOWLEDGE_SOURCE_UPLOADED",
          metadata: {
            sourceId: source.id,
            documentId: document.id,
            name: source.name,
            fileName: file.originalname,
            sizeBytes: file.size,
            contentHash: fileHash,
            storageProvider: storedFile.provider,
            storageKey: storedFile.storageKey,
            storageBucket: storedFile.storageBucket,
            storageRegion: storedFile.storageRegion,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        source,
        document,
      };
    });

    storedFileForCleanup = null;

    return {
      source: {
        id: result.source.id,
        organizationId: result.source.organizationId,
        name: result.source.name,
        type: result.source.type,
        status: result.source.status,
        mimeType: result.source.mimeType,
        sizeBytes: result.source.sizeBytes,
        storageProvider: result.source.storageProvider,
        storageKey: result.source.storageKey,
        storageBucket: result.source.storageBucket,
        storageRegion: result.source.storageRegion,
        createdAt: result.source.createdAt,
      },
      document: {
        id: result.document.id,
        title: result.document.title,
        contentHash: result.document.contentHash,
      },
    };
  } catch (error) {
    if (storedFileForCleanup) {
      await deleteKnowledgeFileFromStorage(storedFileForCleanup).catch(
        () => null,
      );
    }

    await removeFileQuietly(file.path);

    throw error;
  }
}

export async function listKnowledgeSources(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const sources = await prisma.knowledgeSource.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          documents: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    url: source.url,
    filePath: source.filePath,
    storageProvider: source.storageProvider,
    storageKey: source.storageKey,
    storageBucket: source.storageBucket,
    storageRegion: source.storageRegion,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
    documentsCount: source._count.documents,
    createdBy: source.createdBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }));
}

export async function getKnowledgeSourceById(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        include: {
          _count: {
            select: {
              chunks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    url: source.url,
    filePath: source.filePath,
    storageProvider: source.storageProvider,
    storageKey: source.storageKey,
    storageBucket: source.storageBucket,
    storageRegion: source.storageRegion,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
    metadata: source.metadata,
    createdBy: source.createdBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    documents: source.documents.map((document) => ({
      id: document.id,
      title: document.title,
      contentHash: document.contentHash,
      chunksCount: document._count.chunks,
      createdAt: document.createdAt,
    })),
  };
}

export async function deleteKnowledgeSource(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId,
    },
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeSource.delete({
      where: {
        id: source.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        organizationId: membership.organizationId,
        action: "KNOWLEDGE_SOURCE_DELETED",
        metadata: {
          sourceId: source.id,
          name: source.name,
          storageProvider: source.storageProvider,
          storageKey: source.storageKey,
          storageBucket: source.storageBucket,
          storageRegion: source.storageRegion,
        } as Prisma.InputJsonValue,
      },
    });
  });

  await deleteKnowledgeFileFromStorage({
    storageProvider: source.storageProvider,
    filePath: source.filePath,
    storageKey: source.storageKey,
    storageBucket: source.storageBucket,
    storageRegion: source.storageRegion,
  });

  return true;
}

export async function ingestKnowledgeSource(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId,
    },
    include: {
      documents: {
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  if (source.storageProvider === "LOCAL" && !source.filePath) {
    throw createAppError(
      "BadRequestError",
      "Knowledge source does not have a local file path.",
    );
  }

  if (source.storageProvider === "R2" && !source.storageKey) {
    throw createAppError(
      "BadRequestError",
      "Knowledge source does not have an R2 storage key.",
    );
  }

  const document = source.documents[0];

  if (!document) {
    throw createAppError(
      "NotFoundError",
      "Document not found for this knowledge source.",
    );
  }

  await prisma.knowledgeSource.update({
    where: {
      id: source.id,
    },
    data: {
      status: "PROCESSING",
      metadata: {
        ...toJsonObject(source.metadata),
        ingestion: {
          startedAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  try {
    const fileAccess = await getKnowledgeFileAccess({
      storageProvider: source.storageProvider,
      filePath: source.filePath,
      storageKey: source.storageKey,
      storageBucket: source.storageBucket,
      storageRegion: source.storageRegion,
    });

    const ingestionResult = await callAIIngestionService({
      sourceId: source.id,
      documentId: document.id,
      organizationId: membership.organizationId,
      filePath: fileAccess.filePath,
      fileUrl: fileAccess.fileUrl,
      mimeType: source.mimeType,
      metadata: {
        ...toJsonObject(source.metadata),
        storageProvider: source.storageProvider,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: {
          documentId: document.id,
        },
      });

      if (ingestionResult.data.chunks.length > 0) {
        await tx.documentChunk.createMany({
          data: ingestionResult.data.chunks.map((chunk) => ({
            organizationId: membership.organizationId,
            documentId: document.id,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
            tokenCount: chunk.tokenCount,
            metadata: chunk.metadata as Prisma.InputJsonValue,
          })),
        });
      }
    });

    const embeddingResult = await generateAndStoreChunkEmbeddings({
      documentId: document.id,
      organizationId: membership.organizationId,
    });
    if (
      embeddingResult.usage &&
      embeddingResult.provider &&
      embeddingResult.model
    ) {
      await recordAiUsage({
        organizationId: membership.organizationId,
        userId,
        operation: "embedding_document_chunks",
        provider: embeddingResult.provider,
        model: embeddingResult.model,
        promptTokens: embeddingResult.usage.promptTokens,
        completionTokens: embeddingResult.usage.completionTokens,
        totalTokens: embeddingResult.usage.totalTokens,
        isEstimated: embeddingResult.usage.isEstimated,
        metadata: {
          sourceId: source.id,
          documentId: document.id,
          embeddedChunks: embeddingResult.embeddedChunks,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeSource.update({
        where: {
          id: source.id,
        },
        data: {
          status: "COMPLETED",
          metadata: {
            ...toJsonObject(source.metadata),
            ingestion: {
              textLength: ingestionResult.data.textLength,
              chunksCount: ingestionResult.data.chunksCount,
              completedAt: new Date().toISOString(),
            },
            embeddings: {
              provider: embeddingResult.provider,
              model: embeddingResult.model,
              dimensions: embeddingResult.dimensions,
              embeddedChunks: embeddingResult.embeddedChunks,
              completedAt: new Date().toISOString(),
            },
          } as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: membership.organizationId,
          action: "KNOWLEDGE_SOURCE_INGESTED",
          metadata: {
            sourceId: source.id,
            documentId: document.id,
            chunksCount: ingestionResult.data.chunksCount,
            textLength: ingestionResult.data.textLength,
            storageProvider: source.storageProvider,
            embeddingProvider: embeddingResult.provider,
            embeddingModel: embeddingResult.model,
            embeddingDimensions: embeddingResult.dimensions,
            embeddedChunks: embeddingResult.embeddedChunks,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return {
      sourceId: source.id,
      documentId: document.id,
      status: "COMPLETED",
      chunksCount: ingestionResult.data.chunksCount,
      textLength: ingestionResult.data.textLength,
      embeddings: embeddingResult,
    };
  } catch (error) {
    await prisma.knowledgeSource.update({
      where: {
        id: source.id,
      },
      data: {
        status: "FAILED",
        metadata: {
          ...toJsonObject(source.metadata),
          ingestionError: {
            message: error instanceof Error ? error.message : "Unknown error",
            failedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        organizationId: membership.organizationId,
        action: "KNOWLEDGE_SOURCE_INGESTION_FAILED",
        metadata: {
          sourceId: source.id,
          documentId: document.id,
          storageProvider: source.storageProvider,
          error: error instanceof Error ? error.message : "Unknown error",
        } as Prisma.InputJsonValue,
      },
    });

    throw error;
  }
}

type SearchChunkRow = {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number | null;
  metadata: unknown;
  createdAt: Date;
  documentTitle: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  score: number;
};

type HybridCandidate = SearchChunkRow & {
  keywordScore: number;
  vectorScore: number;
  termCoverageScore: number;
  hybridScore: number;
  retrievalMethods: Array<"keyword" | "vector">;
};

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function extractSearchTerms(query: string) {
  const stopWords = new Set([
    "what",
    "should",
    "support",
    "agent",
    "team",
    "does",
    "did",
    "the",
    "is",
    "are",
    "was",
    "were",
    "but",
    "and",
    "or",
    "if",
    "then",
    "when",
    "why",
    "how",
    "to",
    "for",
    "of",
    "in",
    "on",
    "with",
    "from",
    "into",
    "about",
    "this",
    "that",
    "these",
    "those",
    "can",
    "could",
    "would",
    "please",
    "tell",
    "explain",
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 2)
        .filter((term) => !stopWords.has(term)),
    ),
  );
}

function calculateTermCoverageScore(query: string, chunkText: string) {
  const terms = extractSearchTerms(query);

  if (terms.length === 0) {
    return 0;
  }

  const lowerChunkText = chunkText.toLowerCase();

  const matchedTerms = terms.filter((term) => lowerChunkText.includes(term));

  return matchedTerms.length / terms.length;
}

function normalizeKeywordScore(score: number, maxScore: number) {
  if (!maxScore || maxScore <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, score / maxScore));
}

function normalizeVectorScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

function buildContextText(chunks: SearchChunkRow[]) {
  return chunks
    .map((chunk, index) => {
      return [
        `Source ${index + 1}: ${chunk.sourceName}`,
        `Document: ${chunk.documentTitle}`,
        `Chunk Index: ${chunk.chunkIndex}`,
        `Retrieval Score: ${Number(chunk.score).toFixed(4)}`,
        "Content:",
        chunk.chunkText,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

async function keywordSearchChunks(input: {
  organizationId: string;
  query: string;
  limit: number;
}) {
  const rows = await prisma.$queryRaw<SearchChunkRow[]>`
    WITH search_query AS (
      SELECT websearch_to_tsquery('english', ${input.query}) AS query
    )
    SELECT
      dc.id,
      dc."documentId",
      dc."chunkIndex",
      dc."chunkText",
      dc."tokenCount",
      dc.metadata,
      dc."createdAt",
      d.title AS "documentTitle",
      ks.id AS "sourceId",
      ks.name AS "sourceName",
      ks.type AS "sourceType",
      ts_rank_cd(
        to_tsvector('english', dc."chunkText"),
        search_query.query
      ) AS score
    FROM "DocumentChunk" dc
    CROSS JOIN search_query
    INNER JOIN "Document" d ON d.id = dc."documentId"
    INNER JOIN "KnowledgeSource" ks ON ks.id = d."sourceId"
    WHERE dc."organizationId" = ${input.organizationId}
      AND ks.status = 'COMPLETED'
      AND to_tsvector('english', dc."chunkText") @@ search_query.query
    ORDER BY score DESC, dc."createdAt" DESC
    LIMIT ${input.limit};
  `;

  if (rows.length > 0) {
    return rows;
  }

  return prisma.$queryRaw<SearchChunkRow[]>`
    SELECT
      dc.id,
      dc."documentId",
      dc."chunkIndex",
      dc."chunkText",
      dc."tokenCount",
      dc.metadata,
      dc."createdAt",
      d.title AS "documentTitle",
      ks.id AS "sourceId",
      ks.name AS "sourceName",
      ks.type AS "sourceType",
      0.1 AS score
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d ON d.id = dc."documentId"
    INNER JOIN "KnowledgeSource" ks ON ks.id = d."sourceId"
    WHERE dc."organizationId" = ${input.organizationId}
      AND ks.status = 'COMPLETED'
      AND dc."chunkText" ILIKE ${`%${input.query}%`}
    ORDER BY dc."createdAt" DESC
    LIMIT ${input.limit};
  `;
}

async function vectorSearchChunks(input: {
  organizationId: string;
  queryEmbedding: number[];
  limit: number;
}) {
  const vector = serializeVector(input.queryEmbedding);

  return prisma.$queryRaw<SearchChunkRow[]>`
    SELECT
      dc.id,
      dc."documentId",
      dc."chunkIndex",
      dc."chunkText",
      dc."tokenCount",
      dc.metadata,
      dc."createdAt",
      d.title AS "documentTitle",
      ks.id AS "sourceId",
      ks.name AS "sourceName",
      ks.type AS "sourceType",
      GREATEST(0, 1 - (dc."embedding" <=> ${vector}::vector)) AS score
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d ON d.id = dc."documentId"
    INNER JOIN "KnowledgeSource" ks ON ks.id = d."sourceId"
    WHERE dc."organizationId" = ${input.organizationId}
      AND ks.status = 'COMPLETED'
      AND dc."embedding" IS NOT NULL
    ORDER BY dc."embedding" <=> ${vector}::vector ASC
    LIMIT ${input.limit};
  `;
}

function rerankHybridCandidates(input: {
  query: string;
  keywordRows: SearchChunkRow[];
  vectorRows: SearchChunkRow[];
  limit: number;
}) {
  const candidates = new Map<string, HybridCandidate>();

  const maxKeywordScore = Math.max(
    0,
    ...input.keywordRows.map((row) => Number(row.score)),
  );

  for (const row of input.keywordRows) {
    const rawKeywordScore = Number(row.score);
    const normalizedKeywordScore = normalizeKeywordScore(
      rawKeywordScore,
      maxKeywordScore,
    );

    candidates.set(row.id, {
      ...row,
      keywordScore: normalizedKeywordScore,
      vectorScore: 0,
      termCoverageScore: calculateTermCoverageScore(input.query, row.chunkText),
      hybridScore: 0,
      retrievalMethods: ["keyword"],
    });
  }

  for (const row of input.vectorRows) {
    const rawVectorScore = Number(row.score);
    const normalizedVectorScore = normalizeVectorScore(rawVectorScore);

    const existing = candidates.get(row.id);

    if (existing) {
      existing.vectorScore = Math.max(
        existing.vectorScore,
        normalizedVectorScore,
      );

      if (!existing.retrievalMethods.includes("vector")) {
        existing.retrievalMethods.push("vector");
      }

      continue;
    }

    candidates.set(row.id, {
      ...row,
      keywordScore: 0,
      vectorScore: normalizedVectorScore,
      termCoverageScore: calculateTermCoverageScore(input.query, row.chunkText),
      hybridScore: 0,
      retrievalMethods: ["vector"],
    });
  }

  const reranked = Array.from(candidates.values()).map((candidate) => {
    const hybridScore =
      candidate.keywordScore * env.RAG_KEYWORD_WEIGHT +
      candidate.vectorScore * env.RAG_VECTOR_WEIGHT +
      candidate.termCoverageScore * env.RAG_TERM_COVERAGE_WEIGHT;

    return {
      ...candidate,
      score: hybridScore,
      hybridScore,
    };
  });

  return reranked
    .sort((a, b) => {
      if (b.hybridScore !== a.hybridScore) {
        return b.hybridScore - a.hybridScore;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .filter((candidate) => candidate.hybridScore >= env.RAG_MIN_HYBRID_SCORE)
    .slice(0, input.limit);
}

function mapRowsToChunks(rows: HybridCandidate[] | SearchChunkRow[]) {
  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    chunkText: row.chunkText,
    tokenCount: row.tokenCount,
    score: Number(row.score),
    metadata: row.metadata,
    retrieval: {
      keywordScore: "keywordScore" in row ? row.keywordScore : null,
      vectorScore: "vectorScore" in row ? row.vectorScore : null,
      termCoverageScore:
        "termCoverageScore" in row ? row.termCoverageScore : null,
      hybridScore: "hybridScore" in row ? row.hybridScore : Number(row.score),
      methods: "retrievalMethods" in row ? row.retrievalMethods : ["keyword"],
    },
    source: {
      id: row.sourceId,
      name: row.sourceName,
      type: row.sourceType,
    },
    document: {
      id: row.documentId,
      title: row.documentTitle,
    },
    createdAt: row.createdAt,
  }));
}

export async function searchKnowledgeChunks(
  userId: string,
  input: SearchKnowledgeInput,
) {
  const membership = await getPrimaryMembership(userId);

  const query = normalizeSearchQuery(input.query);
  const requestedLimit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const rerankLimit = Math.max(requestedLimit, env.RAG_RERANK_TOP_K);

  if (!query) {
    throw createAppError("BadRequestError", "Search query is required.");
  }

  if (!env.HYBRID_SEARCH_ENABLED) {
    const keywordRows = await keywordSearchChunks({
      organizationId: membership.organizationId,
      query,
      limit: requestedLimit,
    });

    const chunks = mapRowsToChunks(keywordRows);

    return {
      query,
      retrievalMode: "keyword",
      totalResults: chunks.length,
      chunks,
      context: buildContextText(keywordRows),
    };
  }

  const keywordRowsPromise = keywordSearchChunks({
    organizationId: membership.organizationId,
    query,
    limit: env.RAG_KEYWORD_TOP_K,
  });

  let vectorRows: SearchChunkRow[] = [];
  let embeddingMetadata: {
    provider: string;
    model: string;
    dimensions: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      isEstimated: boolean;
    };
  } | null = null;

  try {
    const queryEmbedding = await generateQueryEmbedding(query);

    embeddingMetadata = {
      provider: queryEmbedding.provider,
      model: queryEmbedding.model,
      dimensions: queryEmbedding.dimensions,
      usage: queryEmbedding.usage,
    };

    vectorRows = await vectorSearchChunks({
      organizationId: membership.organizationId,
      queryEmbedding: queryEmbedding.embedding,
      limit: env.RAG_VECTOR_TOP_K,
    });
  } catch (error) {
    logger.warn(
      {
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message:
            error instanceof Error
              ? error.message
              : "Unknown embedding search error",
        },
      },
      "Vector search failed. Falling back to keyword-only retrieval.",
    );
  }

  const keywordRows = await keywordRowsPromise;

  const rerankedRows =
    vectorRows.length > 0
      ? rerankHybridCandidates({
          query,
          keywordRows,
          vectorRows,
          limit: rerankLimit,
        })
      : keywordRows.slice(0, requestedLimit).map((row) => ({
          ...row,
          keywordScore: Number(row.score),
          vectorScore: 0,
          termCoverageScore: calculateTermCoverageScore(query, row.chunkText),
          hybridScore: Number(row.score),
          retrievalMethods: ["keyword" as const],
        }));

  const finalRows = rerankedRows.slice(0, requestedLimit);
  const chunks = mapRowsToChunks(finalRows);

  return {
    query,
    retrievalMode: vectorRows.length > 0 ? "hybrid" : "keyword_fallback",
    embedding: embeddingMetadata,
    totalResults: chunks.length,
    chunks,
    context: buildContextText(finalRows),
  };
}

export async function getKnowledgeIngestionQueuePayload(
  userId: string,
  sourceId: string,
) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  return {
    userId,
    sourceId: source.id,
    organizationId: source.organizationId,
    status: source.status,
  };
}
