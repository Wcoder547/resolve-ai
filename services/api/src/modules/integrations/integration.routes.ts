import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  createIntegrationController,
  deleteIntegrationController,
  listIntegrationsController,
  updateIntegrationStatusController
} from "./integration.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission(PERMISSIONS.INTEGRATION_READ),
  listIntegrationsController
);

router.post(
  "/",
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  createIntegrationController
);

router.patch(
  "/:integrationId/status",
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  updateIntegrationStatusController
);

router.delete(
  "/:integrationId",
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  deleteIntegrationController
);

export default router;