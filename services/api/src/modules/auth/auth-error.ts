import type { Response } from "express";
import { z } from "zod";

export function createAuthError(
  name: string,
  message: string,
  code?: string,
) {
  const error = new Error(message) as Error & { code?: string };
  error.name = name;
  if (code) {
    error.code = code;
  }
  return error;
}

export function formatZodValidationError(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstIssue = error.issues[0];

  return {
    message: firstIssue?.message || "Validation failed.",
    errors: fieldErrors,
  };
}

export function handleAuthHttpError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    const formatted = formatZodValidationError(error);
    return res.status(400).json({
      success: false,
      message: formatted.message,
      errors: formatted.errors,
      code: "VALIDATION_ERROR",
    });
  }

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;

    if (error.name === "BadRequestError") {
      return res.status(400).json({
        success: false,
        message: error.message,
        ...(code ? { code } : {}),
      });
    }
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        success: false,
        message: error.message,
        ...(code ? { code } : {}),
      });
    }
    if (error.name === "ForbiddenError") {
      return res.status(403).json({
        success: false,
        message: error.message,
        ...(code ? { code } : {}),
      });
    }
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message,
        ...(code ? { code } : {}),
      });
    }
    if (error.name === "ConflictError") {
      return res.status(409).json({
        success: false,
        message: error.message,
        ...(code ? { code } : {}),
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    code: "INTERNAL_ERROR",
  });
}
