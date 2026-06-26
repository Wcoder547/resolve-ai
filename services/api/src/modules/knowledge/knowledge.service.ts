import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { callAIIngestionService } from "./knowledge.ingestion.js";
import type { SearchKnowledgeInput } from "./knowledge.validation.js";
import {
  createFileHash,
  removeFileQuietly,
  sanitizeFileName,
  validateKnowledgeUpload
} from "./knowledge.file-utils.js";
import {
  deleteKnowledgeFileFromStorage,
  getKnowledgeFileAccess,
  saveKnowledgeFileToStorage
} from "../storage/storage.service.js";
import type { StoredFileReference } from "../storage/storage.types.js";

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
      userId
    },
    include: {
      organization: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw createAppError(
      "NotFoundError",
      "No organization found for this user."
    );
  }

  return membership;
}

export async function uploadKnowledgeSource({
  userId,
  file,
  name
}: UploadKnowledgeSourceInput) {
  const membership = await getPrimaryMembership(userId);

  let storedFileForCleanup: StoredFileReference | null = null;

  try {
    await validateKnowledgeUpload(file);

    const fileHash = await createFileHash(file.path);

    const existingDocument = await prisma.document.findFirst({
      where: {
        organizationId: membership.organizationId,
        contentHash: fileHash
      },
      include: {
        source: true
      }
    });

    if (existingDocument) {
      throw createAppError(
        "ConflictError",
        "This document already exists in your knowledge base."
      );
    }

    const storedFile = await saveKnowledgeFileToStorage({
      file,
      organizationId: membership.organizationId
    });

    storedFileForCleanup = {
      storageProvider: storedFile.provider,
      filePath: storedFile.filePath,
      storageKey: storedFile.storageKey,
      storageBucket: storedFile.storageBucket,
      storageRegion: storedFile.storageRegion
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
            uploadHardeningVersion: "phase-4.5-r2"
          } as Prisma.InputJsonValue
        }
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
            storageRegion: storedFile.storageRegion
          } as Prisma.InputJsonValue
        }
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
            storageRegion: storedFile.storageRegion
          } as Prisma.InputJsonValue
        }
      });

      return {
        source,
        document
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
        createdAt: result.source.createdAt
      },
      document: {
        id: result.document.id,
        title: result.document.title,
        contentHash: result.document.contentHash
      }
    };
  } catch (error) {
    if (storedFileForCleanup) {
      await deleteKnowledgeFileFromStorage(storedFileForCleanup).catch(() => null);
    }

    await removeFileQuietly(file.path);

    throw error;
  }
}

export async function listKnowledgeSources(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const sources = await prisma.knowledgeSource.findMany({
    where: {
      organizationId: membership.organizationId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          documents: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
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
    updatedAt: source.updatedAt
  }));
}

export async function getKnowledgeSourceById(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      documents: {
        include: {
          _count: {
            select: {
              chunks: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
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
      createdAt: document.createdAt
    }))
  };
}

export async function deleteKnowledgeSource(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId
    }
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeSource.delete({
      where: {
        id: source.id
      }
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
          storageRegion: source.storageRegion
        } as Prisma.InputJsonValue
      }
    });
  });

  await deleteKnowledgeFileFromStorage({
    storageProvider: source.storageProvider,
    filePath: source.filePath,
    storageKey: source.storageKey,
    storageBucket: source.storageBucket,
    storageRegion: source.storageRegion
  });

  return true;
}

export async function ingestKnowledgeSource(userId: string, sourceId: string) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId
    },
    include: {
      documents: {
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      }
    }
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  if (source.storageProvider === "LOCAL" && !source.filePath) {
    throw createAppError(
      "BadRequestError",
      "Knowledge source does not have a local file path."
    );
  }

  if (source.storageProvider === "R2" && !source.storageKey) {
    throw createAppError(
      "BadRequestError",
      "Knowledge source does not have an R2 storage key."
    );
  }

  const document = source.documents[0];

  if (!document) {
    throw createAppError(
      "NotFoundError",
      "Document not found for this knowledge source."
    );
  }

  await prisma.knowledgeSource.update({
    where: {
      id: source.id
    },
    data: {
      status: "PROCESSING",
      metadata: {
        ...toJsonObject(source.metadata),
        ingestion: {
          startedAt: new Date().toISOString()
        }
      } as Prisma.InputJsonValue
    }
  });

  try {
    const fileAccess = await getKnowledgeFileAccess({
      storageProvider: source.storageProvider,
      filePath: source.filePath,
      storageKey: source.storageKey,
      storageBucket: source.storageBucket,
      storageRegion: source.storageRegion
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
        storageProvider: source.storageProvider
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: {
          documentId: document.id
        }
      });

      if (ingestionResult.data.chunks.length > 0) {
        await tx.documentChunk.createMany({
          data: ingestionResult.data.chunks.map((chunk) => ({
            organizationId: membership.organizationId,
            documentId: document.id,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
            tokenCount: chunk.tokenCount,
            metadata: chunk.metadata as Prisma.InputJsonValue
          }))
        });
      }

      await tx.knowledgeSource.update({
        where: {
          id: source.id
        },
        data: {
          status: "COMPLETED",
          metadata: {
            ...toJsonObject(source.metadata),
            ingestion: {
              textLength: ingestionResult.data.textLength,
              chunksCount: ingestionResult.data.chunksCount,
              completedAt: new Date().toISOString()
            }
          } as Prisma.InputJsonValue
        }
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
            storageProvider: source.storageProvider
          } as Prisma.InputJsonValue
        }
      });
    });

    return {
      sourceId: source.id,
      documentId: document.id,
      status: "COMPLETED",
      chunksCount: ingestionResult.data.chunksCount,
      textLength: ingestionResult.data.textLength
    };
  } catch (error) {
    await prisma.knowledgeSource.update({
      where: {
        id: source.id
      },
      data: {
        status: "FAILED",
        metadata: {
          ...toJsonObject(source.metadata),
          ingestionError: {
            message: error instanceof Error ? error.message : "Unknown error",
            failedAt: new Date().toISOString()
          }
        } as Prisma.InputJsonValue
      }
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
          error: error instanceof Error ? error.message : "Unknown error"
        } as Prisma.InputJsonValue
      }
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

function normalizeSearchQuery(query: string) {
  return query
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function buildContextText(chunks: SearchChunkRow[]) {
  return chunks
    .map((chunk, index) => {
      return [
        `Source ${index + 1}: ${chunk.sourceName}`,
        `Document: ${chunk.documentTitle}`,
        `Chunk Index: ${chunk.chunkIndex}`,
        "Content:",
        chunk.chunkText
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function searchKnowledgeChunks(
  userId: string,
  input: SearchKnowledgeInput
) {
  const membership = await getPrimaryMembership(userId);

  const query = normalizeSearchQuery(input.query);
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);

  if (!query) {
    throw createAppError("BadRequestError", "Search query is required.");
  }

  const rows = await prisma.$queryRaw<SearchChunkRow[]>`
    WITH search_query AS (
      SELECT websearch_to_tsquery('english', ${query}) AS query
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
    WHERE dc."organizationId" = ${membership.organizationId}
      AND ks.status = 'COMPLETED'
      AND to_tsvector('english', dc."chunkText") @@ search_query.query
    ORDER BY score DESC, dc."createdAt" DESC
    LIMIT ${limit};
  `;

  const fallbackRows =
    rows.length > 0
      ? []
      : await prisma.$queryRaw<SearchChunkRow[]>`
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
          WHERE dc."organizationId" = ${membership.organizationId}
            AND ks.status = 'COMPLETED'
            AND dc."chunkText" ILIKE ${`%${query}%`}
          ORDER BY dc."createdAt" DESC
          LIMIT ${limit};
        `;

  const finalRows = rows.length > 0 ? rows : fallbackRows;

  const chunks = finalRows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    chunkText: row.chunkText,
    tokenCount: row.tokenCount,
    score: Number(row.score),
    metadata: row.metadata,
    source: {
      id: row.sourceId,
      name: row.sourceName,
      type: row.sourceType
    },
    document: {
      id: row.documentId,
      title: row.documentTitle
    },
    createdAt: row.createdAt
  }));

  return {
    query,
    totalResults: chunks.length,
    chunks,
    context: buildContextText(finalRows)
  };
}

export async function getKnowledgeIngestionQueuePayload(
  userId: string,
  sourceId: string
) {
  const membership = await getPrimaryMembership(userId);

  const source = await prisma.knowledgeSource.findFirst({
    where: {
      id: sourceId,
      organizationId: membership.organizationId
    },
    select: {
      id: true,
      organizationId: true,
      status: true
    }
  });

  if (!source) {
    throw createAppError("NotFoundError", "Knowledge source not found.");
  }

  return {
    userId,
    sourceId: source.id,
    organizationId: source.organizationId,
    status: source.status
  };
}