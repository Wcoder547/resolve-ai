import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  getMeController,
  loginController,
  logoutAllController,
  logoutController,
  refreshTokenController,
  registerController
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refresh", refreshTokenController);
router.get("/me", requireAuth, getMeController);
router.post("/logout", requireAuth, logoutController);
router.post("/logout-all", requireAuth, logoutAllController);

export default router;