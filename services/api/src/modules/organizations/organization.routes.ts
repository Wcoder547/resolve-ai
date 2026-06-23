import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  getCurrentOrganizationController,
  getOrganizationMembersController
} from "./organization.controller.js";

const router = Router();

router.get("/current", requireAuth, getCurrentOrganizationController);
router.get("/members", requireAuth, getOrganizationMembersController);

export default router;