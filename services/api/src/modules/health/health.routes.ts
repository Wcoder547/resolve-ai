import { Router } from "express";
import {
  healthController,
  liveController,
  metricsController,
  readyController
} from "./health.controller.js";

const router = Router();

router.get("/live", liveController);
router.get("/ready", readyController);
router.get("/health", healthController);
router.get("/metrics", metricsController);

export default router;