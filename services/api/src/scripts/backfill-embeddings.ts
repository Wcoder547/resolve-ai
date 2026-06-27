import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { generateAndStoreChunkEmbeddings } from "../modules/knowledge/knowledge.embedding.js";

async function main() {
  const documents = await prisma.document.findMany({
    where: {
      source: {
        status: "COMPLETED"
      },
      chunks: {
        some: {
          embeddedAt: null
        }
      }
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      _count: {
        select: {
          chunks: true
        }
      }
    },
    take: 100,
    orderBy: {
      createdAt: "asc"
    }
  });

  logger.info(
    {
      documentsCount: documents.length
    },
    "Starting embedding backfill"
  );

  for (const document of documents) {
    try {
      logger.info(
        {
          documentId: document.id,
          title: document.title,
          chunksCount: document._count.chunks
        },
        "Backfilling document embeddings"
      );

      const result = await generateAndStoreChunkEmbeddings({
        documentId: document.id,
        organizationId: document.organizationId
      });

      logger.info(
        {
          documentId: document.id,
          result
        },
        "Document embeddings backfilled"
      );
    } catch (error) {
      logger.error(
        {
          documentId: document.id,
          error: {
            message: error instanceof Error ? error.message : "Unknown error"
          }
        },
        "Document embedding backfill failed"
      );
    }
  }

  logger.info("Embedding backfill completed");
}

main()
  .catch((error) => {
    logger.error(
      {
        error: {
          message: error instanceof Error ? error.message : "Unknown error"
        }
      },
      "Embedding backfill script failed"
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });