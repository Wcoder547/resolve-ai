import { createHash } from "crypto";
import fs from "fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { callAIIngestionService } from "./knowledge.ingestion.js";
import type { SearchKnowledgeInput } from "./knowledge.validation.js";

type UploadKnowledgeSourceInput = {
  userId: string;
  file: Express.Multer.File;
  name?: string;
};

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
    const error = new Error("No organization found for this user.");
    error.name = "NotFoundError";
    throw error;
  }

  return membership;
}

async function createFileHash(filePath: string) {
  const buffer = await fs.readFile(filePath);

  return createHash("sha256").update(buffer).digest("hex");
}

export async function uploadKnowledgeSource({
  userId,
  file,
  name,
}: UploadKnowledgeSourceInput) {
  const membership = await getPrimaryMembership(userId);

  const fileHash = await createFileHash(file.path);
  const sourceName = name?.trim() || file.originalname;

  const result = await prisma.$transaction(async (tx) => {
    const source = await tx.knowledgeSource.create({
      data: {
        organizationId: membership.organizationId,
        createdByUserId: userId,
        type: "FILE",
        name: sourceName,
        status: "PENDING",
        filePath: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        metadata: {
          originalName: file.originalname,
          storedName: file.filename,
          encoding: file.encoding,
        },
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
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
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
        },
      },
    });

    return {
      source,
      document,
    };
  });

  return {
    source: {
      id: result.source.id,
      name: result.source.name,
      type: result.source.type,
      status: result.source.status,
      mimeType: result.source.mimeType,
      sizeBytes: result.source.sizeBytes,
      createdAt: result.source.createdAt,
    },
    document: {
      id: result.document.id,
      title: result.document.title,
      contentHash: result.document.contentHash,
    },
  };
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
    const error = new Error("Knowledge source not found.");
    error.name = "NotFoundError";
    throw error;
  }

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    url: source.url,
    filePath: source.filePath,
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
    const error = new Error("Knowledge source not found.");
    error.name = "NotFoundError";
    throw error;
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
        },
      },
    });
  });

  if (source.filePath) {
    await fs.unlink(source.filePath).catch(() => null);
  }

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
    const error = new Error("Knowledge source not found.");
    error.name = "NotFoundError";
    throw error;
  }

  if (!source.filePath) {
    const error = new Error("Knowledge source does not have a file path.");
    error.name = "BadRequestError";
    throw error;
  }

  const document = source.documents[0];

  if (!document) {
    const error = new Error("Document not found for this knowledge source.");
    error.name = "NotFoundError";
    throw error;
  }

  await prisma.knowledgeSource.update({
    where: {
      id: source.id,
    },
    data: {
      status: "PROCESSING",
    },
  });

  try {
    const ingestionResult = await callAIIngestionService({
      sourceId: source.id,
      documentId: document.id,
      organizationId: membership.organizationId,
      filePath: source.filePath,
      mimeType: source.mimeType,
      metadata:
        source.metadata && typeof source.metadata === "object"
          ? (source.metadata as Record<string, unknown>)
          : {},
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

      await tx.knowledgeSource.update({
        where: {
          id: source.id,
        },
        data: {
          status: "COMPLETED",
          metadata: {
            ...(source.metadata &&
            typeof source.metadata === "object" &&
            !Array.isArray(source.metadata)
              ? source.metadata
              : {}),
            ingestion: {
              textLength: ingestionResult.data.textLength,
              chunksCount: ingestionResult.data.chunksCount,
              completedAt: new Date().toISOString(),
            },
          },
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
          },
        },
      });
    });

    return {
      sourceId: source.id,
      documentId: document.id,
      status: "COMPLETED",
      chunksCount: ingestionResult.data.chunksCount,
      textLength: ingestionResult.data.textLength,
    };
  } catch (error) {
    await prisma.knowledgeSource.update({
      where: {
        id: source.id,
      },
      data: {
        status: "FAILED",
        metadata: {
          ...(source.metadata &&
          typeof source.metadata === "object" &&
          !Array.isArray(source.metadata)
            ? source.metadata
            : {}),
          ingestionError:
            error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date().toISOString(),
        },
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

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function buildContextText(chunks: SearchChunkRow[]) {
  return chunks
    .map((chunk, index) => {
      return [
        `Source ${index + 1}: ${chunk.sourceName}`,
        `Document: ${chunk.documentTitle}`,
        `Chunk Index: ${chunk.chunkIndex}`,
        `Content:`,
        chunk.chunkText,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function searchKnowledgeChunks(
  userId: string,
  input: SearchKnowledgeInput,
) {
  const membership = await getPrimaryMembership(userId);

  const query = normalizeSearchQuery(input.query);
  const limit = input.limit ?? 5;

  if (!query) {
    const error = new Error("Search query is required.");
    error.name = "BadRequestError";
    throw error;
  }

  const rows = await prisma.$queryRaw<SearchChunkRow[]>`
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
        websearch_to_tsquery('english', ${query})
      ) AS score
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d ON d.id = dc."documentId"
    INNER JOIN "KnowledgeSource" ks ON ks.id = d."sourceId"
    WHERE dc."organizationId" = ${membership.organizationId}
      AND ks.status = 'COMPLETED'
      AND to_tsvector('english', dc."chunkText") @@ websearch_to_tsquery('english', ${query})
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
      type: row.sourceType,
    },
    document: {
      id: row.documentId,
      title: row.documentTitle,
    },
    createdAt: row.createdAt,
  }));

  return {
    query,
    totalResults: chunks.length,
    chunks,
    context: buildContextText(finalRows),
  };
}
