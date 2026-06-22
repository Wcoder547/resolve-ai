import { Router } from "express";
import {
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController
} from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refresh", refreshTokenController);
router.get("/me", requireAuth, getMeController);
router.post("/logout", requireAuth, logoutController);

export default router;