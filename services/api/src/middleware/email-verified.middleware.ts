import type { NextFunction, RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/express.js";

function createForbiddenError(message: string, code?: string) {
  const error = new Error(message) as Error & { code?: string };
  error.name = "ForbiddenError";
  if (code) {
    error.code = code;
  }
  return error;
}

export const requireVerifiedEmail: RequestHandler = async (
  req,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!env.EMAIL_VERIFICATION_ENABLED) {
      return next();
    }

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || authReq.user?.userId;

    if (!userId) {
      throw createForbiddenError("User account not found.");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw createForbiddenError("User account not found.");
    }

    if (!user.emailVerifiedAt) {
      throw createForbiddenError(
        "Please verify your email before using this feature.",
        "EMAIL_NOT_VERIFIED",
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
