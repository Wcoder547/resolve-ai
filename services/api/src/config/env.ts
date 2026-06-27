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
    FOLLOWUP_REWRITE_ENABLED: z.coerce.boolean().default(true),

    QUESTION_REWRITE_TIMEOUT_MS: z.coerce
      .number()
      .min(5000)
      .max(120000)
      .default(30000),

    CHAT_HISTORY_LIMIT: z.coerce.number().min(0).max(30).default(12),

    AI_USAGE_TRACKING_ENABLED: z.coerce.boolean().default(true),

    AI_DAILY_REQUEST_LIMIT: z.coerce.number().min(1).max(1000000).default(1000),

    AI_DAILY_TOKEN_LIMIT: z.coerce
      .number()
      .min(1000)
      .max(100000000)
      .default(200000),

    AI_MONTHLY_TOKEN_LIMIT: z.coerce
      .number()
      .min(1000)
      .max(1000000000)
      .default(3000000),

    AI_INPUT_COST_PER_1M_TOKENS: z.coerce.number().min(0).default(0),

    AI_OUTPUT_COST_PER_1M_TOKENS: z.coerce.number().min(0).default(0),

    CHAT_HISTORY_MAX_CHARS: z.coerce.number().min(500).max(20000).default(6000),
    AI_EMBEDDING_TIMEOUT_MS: z.coerce
      .number()
      .min(5000)
      .max(300000)
      .default(120000),

    EMBEDDING_DIMENSIONS: z.coerce.number().min(1).max(4096).default(384),

    RAG_MAX_CONTEXT_CHARS: z.coerce
      .number()
      .min(1000)
      .max(50000)
      .default(12000),

    RAG_MIN_RELEVANCE_SCORE: z.coerce.number().min(0).max(1).default(0.0001),
    SLOW_QUERY_LOG_MS: z.coerce.number().min(50).max(10000).default(300),
    HYBRID_SEARCH_ENABLED: z.coerce.boolean().default(true),

    RAG_KEYWORD_TOP_K: z.coerce.number().min(1).max(50).default(20),

    RAG_VECTOR_TOP_K: z.coerce.number().min(1).max(50).default(20),

    RAG_RERANK_TOP_K: z.coerce.number().min(1).max(20).default(8),

    RAG_KEYWORD_WEIGHT: z.coerce.number().min(0).max(1).default(0.4),

    RAG_VECTOR_WEIGHT: z.coerce.number().min(0).max(1).default(0.5),

    RAG_TERM_COVERAGE_WEIGHT: z.coerce.number().min(0).max(1).default(0.1),

    RAG_MIN_HYBRID_SCORE: z.coerce.number().min(0).max(1).default(0.05),

    RAG_EVAL_USER_EMAIL: z
      .string()
      .email()
      .optional()
      .default("waseem@example.com"),

    RAG_EVAL_PASSING_SCORE: z.coerce.number().min(0).max(1).default(0.75),

    RAG_EVAL_OUTPUT_DIR: z.string().min(1).default("eval-reports"),

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
