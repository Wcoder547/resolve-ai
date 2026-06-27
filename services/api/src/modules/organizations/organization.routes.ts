import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  getCurrentOrganizationController,
getOrganizationMembersController  
} from "./organization.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/current", requirePermission(PERMISSIONS.ORGANIZATION_READ), getCurrentOrganizationController);
router.get("/members", requirePermission(PERMISSIONS.ORGANIZATION_READ), getOrganizationMembersController);

export default router;