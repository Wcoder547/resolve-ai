import { Request, Response } from "express";
import { z } from "zod";
import {
  loginSchema,
  refreshSchema,
  registerSchema
} from "./auth.validation.js";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  registerUser
} from "./auth.service.js";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";



function handleControllerError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
  const flattened = z.flattenError(error);
  
  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors: flattened.fieldErrors
  });

  }

  if (error instanceof Error) {
    if (error.name === "ConflictError") {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
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
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: result
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);

    return res.json({
      success: true,
      message: "Logged in successfully.",
      data: result
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function refreshTokenController(req: Request, res: Response) {
  try {
    const data = refreshSchema.parse(req.body);
    const result = await refreshUserToken(data);

    return res.json({
      success: true,
      message: "Token refreshed successfully.",
      data: result
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function getMeController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    const result = await getCurrentUser(userId);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function logoutController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    await logoutUser(userId);

    return res.json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}