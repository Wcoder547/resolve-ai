import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env.js";
import { logger } from "../lib/logger.js";

type AppError = Error & {
  statusCode?: number;
  status?: number;
};

function getStatusCode(error: AppError) {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;

  if (error.name === "BadRequestError") return 400;
  if (error.name === "UnauthorizedError") return 401;
  if (error.name === "ForbiddenError") return 403;
  if (error.name === "NotFoundError") return 404;
  if (error.name === "ConflictError") return 409;
  if (error.name === "AIServiceTimeoutError") return 504;
  if (error.name === "AIServiceError") return 502;

  return 500;
}

export function errorMiddleware(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = getStatusCode(error);

  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: isProduction ? undefined : error.stack
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        requestId: (req as Request & { id?: string }).id
      },
      statusCode
    },
    "Request failed"
  );

  return res.status(statusCode).json({
    success: false,
    message:
      isProduction && statusCode === 500
        ? "Internal server error."
        : error.message || "Something went wrong.",
    error: isProduction
      ? undefined
      : {
          name: error.name,
          stack: error.stack
        }
  });
}