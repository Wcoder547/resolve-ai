import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireVerifiedEmail } from "../../middleware/email-verified.middleware.js";
import {
  changePasswordController,
  getMeController,
  listSessionsController,
  loginController,
  logoutAllController,
  logoutController,
  refreshTokenController,
  registerController,
  revokeOtherSessionsController,
  revokeSessionController,
} from "./auth.controller.js";
import {
  resendEmailVerificationController,
  verifyEmailByBodyController,
  verifyEmailByQueryController,
} from "./email-verification.controller.js";
import {
  forgotPasswordController,
  resetPasswordController,
} from "./password-reset.controller.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refresh", refreshTokenController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.get("/verify-email", verifyEmailByQueryController);
router.post("/verify-email", verifyEmailByBodyController);
// Public (email in body) or authenticated — no requireAuth so locked-out users can resend
router.post("/resend-verification", resendEmailVerificationController);
router.get("/me", requireAuth, getMeController);
router.post(
  "/change-password",
  requireAuth,
  requireVerifiedEmail,
  changePasswordController,
);
router.get("/sessions", requireAuth, listSessionsController);
router.post(
  "/sessions/revoke-others",
  requireAuth,
  revokeOtherSessionsController,
);
router.delete("/sessions/:sessionId", requireAuth, revokeSessionController);
router.post("/logout", requireAuth, logoutController);
router.post("/logout-all", requireAuth, logoutAllController);

export default router;
