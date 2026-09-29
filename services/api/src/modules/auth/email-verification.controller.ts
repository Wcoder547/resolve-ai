import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import { handleAuthHttpError } from "./auth-error.js";
import {
  resendEmailVerification,
  resendEmailVerificationByEmail,
  verifyEmailToken,
} from "./email-verification.service.js";
import {
  resendVerificationBodySchema,
  verifyEmailBodySchema,
  verifyEmailQuerySchema,
} from "./email-verification.validation.js";

export async function verifyEmailByQueryController(req: Request, res: Response) {
  try {
    const input = verifyEmailQuerySchema.parse(req.query);
    const result = await verifyEmailToken(input.token);

    return res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function verifyEmailByBodyController(req: Request, res: Response) {
  try {
    const input = verifyEmailBodySchema.parse(req.body);
    const result = await verifyEmailToken(input.token);

    return res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function resendEmailVerificationController(
  req: Request,
  res: Response,
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || authReq.user?.userId;
    const input = resendVerificationBodySchema.parse(req.body || {});

    if (userId) {
      const result = await resendEmailVerification(userId);

      return res.json({
        success: true,
        message: result.message || "Verification email sent.",
        data: result,
      });
    }

    if (!input.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to resend verification.",
        code: "VALIDATION_ERROR",
        errors: {
          email: ["Email is required to resend verification."],
        },
      });
    }

    const result = await resendEmailVerificationByEmail(input.email);

    return res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}
