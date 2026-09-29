import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  deleteOrganization,
  getCurrentOrganization,
  getOrganizationMembers,
  removeOrganizationMember,
  transferOrganizationOwnership,
  updateOrganization,
  updateOrganizationMemberRole,
  updateOrganizationPlan
} from "./organization.service.js";
import { updateOrganizationMemberSchema } from "./organization-member.validation.js";
import {
  deleteOrganizationSchema,
  transferOrganizationSchema,
  updateOrganizationPlanSchema,
  updateOrganizationSchema
} from "./organization.validation.js";
import { listOrganizationAuditLogs } from "./organization-audit.service.js";

export function handleOrganizationError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten().fieldErrors
    });
  }

  if (error instanceof Error) {
    if (error.name === "BadRequestError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "ForbiddenError") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.name === "ConflictError") {
      return res.status(409).json({ success: false, message: error.message });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
}

export function requireActor(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id || authReq.user?.userId;
  const organization = authReq.organization;

  if (!userId || !organization) {
    res.status(401).json({ success: false, message: "Unauthorized." });
    return null;
  }

  return { userId, organization };
}

function memberIdFromParams(req: Request) {
  return Array.isArray(req.params.memberId)
    ? req.params.memberId[0]
    : req.params.memberId;
}

export async function getCurrentOrganizationController(
  req: Request,
  res: Response
) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const organization = await getCurrentOrganization(userId);

    return res.json({ success: true, data: { organization } });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function getOrganizationMembersController(
  req: Request,
  res: Response
) {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const members = await getOrganizationMembers(userId);

    return res.json({ success: true, data: { members } });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function updateOrganizationMemberController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const memberId = memberIdFromParams(req);
    if (!memberId) {
      return res.status(400).json({ success: false, message: "Member id is required." });
    }

    const input = updateOrganizationMemberSchema.parse(req.body);
    const member = await updateOrganizationMemberRole(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      memberId,
      input
    );

    return res.json({
      success: true,
      message: "Member role updated.",
      data: { member }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function removeOrganizationMemberController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const memberId = memberIdFromParams(req);
    if (!memberId) {
      return res.status(400).json({ success: false, message: "Member id is required." });
    }

    await removeOrganizationMember(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      memberId
    );

    return res.json({
      success: true,
      message: "Member removed."
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function updateOrganizationController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = updateOrganizationSchema.parse(req.body);
    const organization = await updateOrganization(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      input
    );

    return res.json({
      success: true,
      message: "Organization updated.",
      data: { organization }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function transferOrganizationController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = transferOrganizationSchema.parse(req.body);
    const organization = await transferOrganizationOwnership(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      input
    );

    return res.json({
      success: true,
      message: "Ownership transferred.",
      data: { organization }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function deleteOrganizationController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = deleteOrganizationSchema.parse(req.body);
    await deleteOrganization(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      input
    );

    return res.json({
      success: true,
      message: "Workspace deleted."
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function updateOrganizationPlanController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = updateOrganizationPlanSchema.parse(req.body);
    const organization = await updateOrganizationPlan(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      input
    );

    return res.json({
      success: true,
      message: "Plan updated.",
      data: { organization }
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function listOrganizationAuditLogsController(
  req: Request,
  res: Response
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const limit = Number(req.query.limit);
    const action =
      typeof req.query.action === "string" ? req.query.action : undefined;

    const logs = await listOrganizationAuditLogs(actor.organization.id, {
      limit: Number.isFinite(limit) ? limit : undefined,
      action,
    });

    return res.json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}