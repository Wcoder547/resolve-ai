import { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  getCurrentOrganization,
  getOrganizationMembers
} from "./organization.service.js";

function handleOrganizationError(error: unknown, res: Response) {
  if (error instanceof Error) {
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

export async function getCurrentOrganizationController(
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

    const organization = await getCurrentOrganization(userId);

    return res.json({
      success: true,
      data: {
        organization
      }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function getOrganizationMembersController(
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

    const members = await getOrganizationMembers(userId);

    return res.json({
      success: true,
      data: {
        members
      }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}