import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  getCurrentUser,
  loginUser,
  logoutAllUserSessions,
  logoutUser,
  refreshUserToken,
  registerUser
} from "./auth.service.js";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema
} from "./auth.validation.js";

function handleAuthError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten().fieldErrors
    });
  }

  if (error instanceof Error) {
    if (error.name === "ConflictError") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.name === "NotFoundError") {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
}


export async function registerController(req: Request, res: Response) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: result
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);

    return res.json({
      success: true,
      message: "User logged in successfully.",
      data: result
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

export async function refreshTokenController(req: Request, res: Response) {
  try {
    const input = refreshSchema.parse(req.body);
    const result = await refreshUserToken(input);

    return res.json({
      success: true,
      message: "Token refreshed successfully.",
      data: result
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}


export async function getMeController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const result = await getCurrentUser(userId);

    return res.json({ success: true, data: result });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

export async function logoutController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const input = logoutSchema.parse(req.body || {});
    await logoutUser(userId, input);

    return res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

export async function logoutAllController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    await logoutAllUserSessions(userId);

    return res.json({
      success: true,
      message: "Logged out from all sessions successfully."
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}