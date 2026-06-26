import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { createRedisConnection } from "../../lib/redis.js";
import { QUEUE_NAMES } from "./jobs.constants.js";
import type {
  KnowledgeIngestionJobData,
  KnowledgeIngestionTrigger
} from "./jobs.types.js";

const queueConnection = createRedisConnection();

export const knowledgeIngestionQueue = new Queue<KnowledgeIngestionJobData>(
  QUEUE_NAMES.KNOWLEDGE_INGESTION,
  {
    connection: queueConnection,
    prefix: env.QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: env.INGESTION_JOB_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: env.INGESTION_JOB_BACKOFF_MS
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5000
      }
    }
  }
);

type EnqueueKnowledgeIngestionInput = {
  sourceId: string;
  userId: string;
  organizationId: string;
  trigger: KnowledgeIngestionTrigger;
};

export async function enqueueKnowledgeIngestionJob(
  input: EnqueueKnowledgeIngestionInput
) {
  const requestedAt = new Date().toISOString();

  const job = await knowledgeIngestionQueue.add(
    "ingest-knowledge-source",
    {
      sourceId: input.sourceId,
      userId: input.userId,
      organizationId: input.organizationId,
      trigger: input.trigger,
      requestedAt
    },
    {
      jobId: `knowledge-ingestion:${input.sourceId}:${Date.now()}`
    }
  );

  return {
    id: job.id,
    name: job.name,
    queueName: QUEUE_NAMES.KNOWLEDGE_INGESTION
  };
}