import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getMyPermissionsController } from "./rbac.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyPermissionsController);

export default router;