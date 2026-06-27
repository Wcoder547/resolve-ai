import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  getAiUsageSummaryController,
  listAiUsageEventsController
} from "./usage.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/ai/summary",
  requirePermission(PERMISSIONS.USAGE_READ),
  getAiUsageSummaryController
);

router.get(
  "/ai/events",
  requirePermission(PERMISSIONS.USAGE_READ),
  listAiUsageEventsController
);

export default router;