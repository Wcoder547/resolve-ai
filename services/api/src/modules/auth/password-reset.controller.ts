import type { Request, Response } from "express";
import { handleAuthHttpError } from "./auth-error.js";
import {
  requestPasswordReset,
  resetPassword,
} from "./password-reset.service.js";
import {
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
} from "./password-reset.validation.js";

export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const input = forgotPasswordBodySchema.parse(req.body);
    const result = await requestPasswordReset(input);

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function resetPasswordController(req: Request, res: Response) {
  try {
    const input = resetPasswordBodySchema.parse(req.body);
    const result = await resetPassword(input);

    return res.json({
      success: true,
      message: result.message || "Password has been reset successfully.",
      data: {
        reset: result.reset,
      },
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}
