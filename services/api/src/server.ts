import "dotenv/config";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV
    },
    `Node API running on http://localhost:${env.PORT}`
  );
});