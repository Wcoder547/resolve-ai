import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PORT: z.coerce.number().default(5000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    JWT_ACCESS_SECRET: z
      .string()
      .min(20, "JWT_ACCESS_SECRET must be at least 20 characters"),

    JWT_REFRESH_SECRET: z
      .string()
      .min(20, "JWT_REFRESH_SECRET must be at least 20 characters"),

    AI_SERVICE_URL: z.string().url("AI_SERVICE_URL must be a valid URL"),

    CORS_ORIGIN: z.string().default("http://localhost:3000"),

    REQUEST_BODY_LIMIT: z.string().default("10mb"),

    MAX_UPLOAD_FILE_SIZE_MB: z.coerce.number().min(1).max(100).default(10),

    AI_CHAT_TIMEOUT_MS: z.coerce.number().min(5000).max(180000).default(70000),

    RAG_MAX_CONTEXT_CHARS: z.coerce
      .number()
      .min(1000)
      .max(50000)
      .default(12000),

    RAG_MIN_RELEVANCE_SCORE: z.coerce.number().min(0).max(1).default(0.0001),
    SLOW_QUERY_LOG_MS: z.coerce.number().min(50).max(10000).default(300),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    ENABLE_METRICS: z.coerce.boolean().default(true),

    METRICS_TOKEN: z.string().optional().default(""),

    HEALTH_CHECK_TIMEOUT_MS: z.coerce
      .number()
      .min(1000)
      .max(30000)
      .default(5000),
    STORAGE_PROVIDER: z.enum(["local", "r2"]).default("local"),

    REDIS_URL: z.string().url().default("redis://localhost:6379"),

    QUEUE_PREFIX: z.string().min(1).default("resolveai"),

    KNOWLEDGE_INGESTION_CONCURRENCY: z.coerce
      .number()
      .min(1)
      .max(10)
      .default(2),

    INGESTION_JOB_ATTEMPTS: z.coerce.number().min(1).max(10).default(3),

    INGESTION_JOB_BACKOFF_MS: z.coerce
      .number()
      .min(1000)
      .max(120000)
      .default(10000),

    R2_ACCOUNT_ID: z.string().optional().default(""),
    R2_ACCESS_KEY_ID: z.string().optional().default(""),
    R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
    R2_BUCKET_NAME: z.string().optional().default("resolveai-knowledge"),
    R2_PRESIGNED_URL_EXPIRES_SECONDS: z.coerce
      .number()
      .min(60)
      .max(3600)
      .default(600),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_PROVIDER !== "r2") return;

    const requiredR2Fields: Array<keyof typeof env> = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ];

    for (const field of requiredR2Fields) {
      if (!env[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required when STORAGE_PROVIDER is r2`,
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
