import type { Express } from "express";
import helmet from "helmet";
import { env } from "../config/env.js";

export function applySecurityMiddleware(app: Express) {
  app.disable("x-powered-by");

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      },
      frameguard: {
        action: "deny"
      },
      referrerPolicy: {
        policy: "no-referrer"
      },
      hsts:
        env.NODE_ENV === "production" && env.REQUIRE_HTTPS_IN_PRODUCTION
          ? {
              maxAge: 15552000,
              includeSubDomains: true,
              preload: false
            }
          : false
    })
  );
}