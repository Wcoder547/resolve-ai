import compression from "compression";
import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env, isProduction } from "./config/env.js";

import authRoutes from "./modules/auth/auth.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import knowledgeRoutes from "./modules/knowledge/knowledge.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import {
  aiChatRateLimiter,
  apiRateLimiter,
  authRateLimiter
} from "./middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";

import { logger } from "./lib/logger.js";
import { metricsMiddleware } from "./middleware/metrics.middleware.js";
import healthRoutes from "./modules/health/health.routes.js";


const app = express();

function getAllowedOrigins() {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
}

app.disable("x-powered-by");

app.use(requestIdMiddleware);

app.use(
  pinoHttp({
    logger,
    customProps: (req) => {
      return {
        requestId: (req as Request & { id?: string }).id
      };
    }
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true
  })
);

app.use(compression());
app.use(metricsMiddleware);

app.use(
  express.json({
    limit: env.REQUEST_BODY_LIMIT
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: env.REQUEST_BODY_LIMIT
  })
);

app.get("/", (_req, res) => {
  res.json({
    service: "ResolveAI API Gateway",
    status: "running",
    version: "1.0.0",
    environment: env.NODE_ENV
  });
});

app.use(healthRoutes);

app.use("/api", apiRateLimiter);

app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/chat", aiChatRateLimiter, chatRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;