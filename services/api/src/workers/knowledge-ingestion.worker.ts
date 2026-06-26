import "dotenv/config";
import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { QUEUE_NAMES } from "../modules/jobs/jobs.constants.js";
import type { KnowledgeIngestionJobData } from "../modules/jobs/jobs.types.js";
import { ingestKnowledgeSource } from "../modules/knowledge/knowledge.service.js";
import { logger } from "../lib/logger.js";

const workerConnection = createRedisConnection();

const worker = new Worker<KnowledgeIngestionJobData>(
  QUEUE_NAMES.KNOWLEDGE_INGESTION,
  async (job) => {
    const { sourceId, userId, organizationId, trigger } = job.data;

    logger.info(
  {
    jobId: job.id,
    sourceId,
    organizationId,
    trigger
  },
  "Knowledge ingestion job started"
);

    await job.updateProgress(10);

    await prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action: "KNOWLEDGE_INGESTION_JOB_STARTED",
        metadata: {
          jobId: job.id,
          queueName: QUEUE_NAMES.KNOWLEDGE_INGESTION,
          sourceId,
          trigger,
          attempt: job.attemptsMade + 1
        }
      }
    });

    await job.updateProgress(30);

    const result = await ingestKnowledgeSource(userId, sourceId);

    await job.updateProgress(100);

    return {
      sourceId,
      result
    };
  },
  {
    connection: workerConnection,
    prefix: env.QUEUE_PREFIX,
    concurrency: env.KNOWLEDGE_INGESTION_CONCURRENCY,
    lockDuration: 10 * 60 * 1000
  }
);

worker.on("completed", (job) => {
  logger.info(
    {
      jobId: job.id,
      sourceId: job.data.sourceId
    },
    "Knowledge ingestion job completed"
  );
});

worker.on("failed", async (job, error) => {
  logger.error(
    {
      jobId: job?.id,
      sourceId: job?.data.sourceId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    },
    "Knowledge ingestion job failed"
  );

  if (!job) return;

  await prisma.auditLog
    .create({
      data: {
        userId: job.data.userId,
        organizationId: job.data.organizationId,
        action: "KNOWLEDGE_INGESTION_JOB_FAILED",
        metadata: {
          jobId: job.id,
          queueName: QUEUE_NAMES.KNOWLEDGE_INGESTION,
          sourceId: job.data.sourceId,
          trigger: job.data.trigger,
          attemptsMade: job.attemptsMade,
          error: error.message
        }
      }
    })
    .catch(() => null);
});

async function shutdown() {
  console.log("[Knowledge Worker] Shutting down...");

  await worker.close();
  await workerConnection.quit();
  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info(
  {
    queueName: QUEUE_NAMES.KNOWLEDGE_INGESTION,
    concurrency: env.KNOWLEDGE_INGESTION_CONCURRENCY
  },
  "Knowledge ingestion worker started"
);