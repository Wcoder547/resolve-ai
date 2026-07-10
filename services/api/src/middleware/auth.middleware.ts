import type { RequestHandler } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

export type { AuthenticatedRequest } from "../types/express.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Missing access token."
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid or expired token."
    });
  }
};
