import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { createRedisConnection } from "../../lib/redis.js";
import { healthCheckStatusGauge } from "../../lib/metrics.js";
import { knowledgeIngestionQueue } from "../jobs/knowledge-ingestion.queue.js";

type DependencyCheck = {
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
};

function now() {
  return Date.now();
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeout: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} check timed out.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

async function checkDatabase(): Promise<DependencyCheck> {
  const startedAt = now();

  try {
    await withTimeout(
      prisma.$queryRaw`SELECT 1`,
      env.HEALTH_CHECK_TIMEOUT_MS,
      "Database"
    );

    return {
      status: "ok",
      latencyMs: now() - startedAt
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: now() - startedAt,
      message: error instanceof Error ? error.message : "Database check failed."
    };
  }
}

async function checkRedis(): Promise<DependencyCheck> {
  const startedAt = now();
  const redis = createRedisConnection();

  try {
    const result = await withTimeout(
      redis.ping(),
      env.HEALTH_CHECK_TIMEOUT_MS,
      "Redis"
    );

    return {
      status: result === "PONG" ? "ok" : "error",
      latencyMs: now() - startedAt,
      message: result === "PONG" ? undefined : "Redis did not return PONG."
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: now() - startedAt,
      message: error instanceof Error ? error.message : "Redis check failed."
    };
  } finally {
    redis.disconnect();
  }
}

async function checkAIService(): Promise<DependencyCheck> {
  const startedAt = now();
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.AI_SERVICE_URL}/health`, {
      signal: controller.signal
    });

    return {
      status: response.ok ? "ok" : "error",
      latencyMs: now() - startedAt,
      message: response.ok
        ? undefined
        : `AI service returned HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: now() - startedAt,
      message: error instanceof Error ? error.message : "AI service check failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkKnowledgeQueue(): Promise<DependencyCheck> {
  const startedAt = now();

  try {
    const counts = await withTimeout(
      knowledgeIngestionQueue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed"
      ),
      env.HEALTH_CHECK_TIMEOUT_MS,
      "Knowledge queue"
    );

    return {
      status: "ok",
      latencyMs: now() - startedAt,
      details: counts
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: now() - startedAt,
      message:
        error instanceof Error ? error.message : "Knowledge queue check failed."
    };
  }
}

function updateHealthMetric(name: string, check: DependencyCheck) {
  healthCheckStatusGauge.set(
    {
      dependency: name
    },
    check.status === "ok" ? 1 : 0
  );
}

export async function getLivenessStatus() {
  return {
    status: "ok",
    service: "resolveai-api",
    timestamp: new Date().toISOString()
  };
}

export async function getReadinessStatus() {
  const [database, redis, aiService, knowledgeQueue] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkAIService(),
    checkKnowledgeQueue()
  ]);

  updateHealthMetric("database", database);
  updateHealthMetric("redis", redis);
  updateHealthMetric("ai_service", aiService);
  updateHealthMetric("knowledge_queue", knowledgeQueue);

  const dependencies = {
    database,
    redis,
    aiService,
    knowledgeQueue
  };

  const isReady = Object.values(dependencies).every(
    (dependency) => dependency.status === "ok"
  );

  return {
    status: isReady ? "ok" : "degraded",
    service: "resolveai-api",
    timestamp: new Date().toISOString(),
    dependencies
  };
}