import compression from "compression";
import cors from "cors";
import express, { Request } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { applySecurityMiddleware } from "./middleware/security.middleware.js";

import integrationRoutes from "./modules/integrations/integration.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";
import { metricsMiddleware } from "./middleware/metrics.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import {
  aiChatRateLimiter,
  apiRateLimiter,
  authRateLimiter,
} from "./middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";

import authRoutes from "./modules/auth/auth.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import knowledgeRoutes from "./modules/knowledge/knowledge.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";
import rbacRoutes from "./modules/rbac/rbac.routes.js";
import usageRoutes from "./modules/usage/usage.routes.js";

function getAllowedOrigins() {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
}



export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestIdMiddleware);

  applySecurityMiddleware(app);

  app.use(
    pinoHttp({
      logger,
      customProps: (req) => {
        return {
          requestId: (req as Request & { id?: string }).id,
        };
      },
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  app.use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
    }),
  );

  app.use(compression());

  app.use(
    express.json({
      limit: env.REQUEST_BODY_LIMIT,
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: env.REQUEST_BODY_LIMIT,
    }),
  );

  app.use(metricsMiddleware);

  app.get("/", (_req, res) => {
    res.json({
      service: "ResolveAI API Gateway",
      status: "running",
      version: "1.0.0",
      environment: env.NODE_ENV,
    });
  });

  app.use(healthRoutes);

  app.use("/api", apiRateLimiter);

  app.use("/api/v1/auth", authRateLimiter, authRoutes); // ok 
  app.use("/api/v1/organizations", organizationRoutes); // ok 
  app.use("/api/v1/knowledge", knowledgeRoutes); //ok
  app.use("/api/v1/chat", aiChatRateLimiter, chatRoutes);
  app.use("/api/v1/usage", usageRoutes); //ok 
  app.use("/api/v1/rbac", rbacRoutes); // ok
  app.use("/api/v1/integrations", integrationRoutes); //ok

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export const app = createApp();
