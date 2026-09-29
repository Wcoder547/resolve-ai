import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  changePassword,
  getCurrentUser,
  listUserSessions,
  loginUser,
  logoutAllUserSessions,
  logoutUser,
  refreshUserToken,
  registerUser,
  revokeOtherUserSessions,
  revokeUserSession,
} from "./auth.service.js";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  revokeSessionSchema,
} from "./auth.validation.js";
import { handleAuthHttpError } from "./auth-error.js";

export async function registerController(req: Request, res: Response) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please verify your email before signing in.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);

    return res.json({
      success: true,
      message: "Signed in successfully.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function refreshTokenController(req: Request, res: Response) {
  try {
    const input = refreshSchema.parse(req.body);
    const result = await refreshUserToken(input);

    return res.json({
      success: true,
      message: "Token refreshed successfully.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function getMeController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    const result = await getCurrentUser(userId);

    return res.json({ success: true, data: result });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function logoutController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    const input = logoutSchema.parse(req.body || {});
    await logoutUser(userId, input);

    return res.json({
      success: true,
      message: input.refreshToken
        ? "Logged out successfully."
        : "Logged out from all sessions successfully.",
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function logoutAllController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    await logoutAllUserSessions(userId);

    return res.json({
      success: true,
      message: "Logged out from all sessions successfully.",
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function changePasswordController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.id || authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    const input = changePasswordSchema.parse(req.body);
    const result = await changePassword(userId, input);

    return res.json({
      success: true,
      message: "Password changed successfully. Please sign in again on other devices.",
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function listSessionsController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.id || authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    const currentRefreshToken =
      typeof req.headers["x-refresh-token"] === "string"
        ? req.headers["x-refresh-token"]
        : undefined;

    const result = await listUserSessions(userId, currentRefreshToken);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function revokeSessionController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.id || authReq.user?.userId;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session id is required.",
        code: "VALIDATION_ERROR",
      });
    }

    await revokeUserSession(userId, sessionId);

    return res.json({
      success: true,
      message: "Session revoked successfully.",
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}

export async function revokeOtherSessionsController(
  req: Request,
  res: Response,
) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.id || authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
        code: "UNAUTHORIZED",
      });
    }

    const input = revokeSessionSchema.parse(req.body || {});
    await revokeOtherUserSessions(userId, input.refreshToken);

    return res.json({
      success: true,
      message: "Other sessions have been revoked.",
    });
  } catch (error) {
    return handleAuthHttpError(error, res);
  }
}
