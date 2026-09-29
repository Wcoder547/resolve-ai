import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import { handleAuthHttpError } from "../auth/auth-error.js";
import {
  acceptOrganizationInvite,
  createOrganizationInvite,
  listOrganizationInvites,
  previewOrganizationInvite,
  resendOrganizationInvite,
  revokeOrganizationInvite,
} from "./organization-invite.service.js";
import {
  acceptInviteBodySchema,
  createOrganizationInviteSchema,
  previewInviteQuerySchema,
} from "./organization-invite.validation.js";

const handleInviteError = handleAuthHttpError;

function requireActor(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id || authReq.user?.userId;
  const organization = authReq.organization;

  if (!userId || !organization) {
    res.status(401).json({ success: false, message: "Unauthorized." });
    return null;
  }

  return { userId, organization };
}

export async function previewOrganizationInviteController(
  req: Request,
  res: Response,
) {
  try {
    const input = previewInviteQuerySchema.parse(req.query);
    const result = await previewOrganizationInvite(input.token);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}

export async function acceptOrganizationInviteController(
  req: Request,
  res: Response,
) {
  try {
    const input = acceptInviteBodySchema.parse(req.body);
    const result = await acceptOrganizationInvite(input);

    return res.json({
      success: true,
      message: "Invitation accepted.",
      data: result,
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}

export async function createOrganizationInviteController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = createOrganizationInviteSchema.parse(req.body);
    const result = await createOrganizationInvite(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      input,
    );

    return res.status(201).json({
      success: true,
      message: "Invitation sent.",
      data: result,
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}

export async function listOrganizationInvitesController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const invites = await listOrganizationInvites(actor.organization.id);

    return res.json({
      success: true,
      data: { invites },
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}

export async function resendOrganizationInviteController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const inviteId = Array.isArray(req.params.inviteId)
      ? req.params.inviteId[0]
      : req.params.inviteId;

    if (!inviteId) {
      return res.status(400).json({
        success: false,
        message: "Invite id is required.",
      });
    }

    const result = await resendOrganizationInvite(
      actor.userId,
      actor.organization.id,
      actor.organization.role,
      inviteId,
    );

    return res.json({
      success: true,
      message: "Invitation resent.",
      data: result,
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}

export async function revokeOrganizationInviteController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const inviteId = Array.isArray(req.params.inviteId)
      ? req.params.inviteId[0]
      : req.params.inviteId;

    if (!inviteId) {
      return res.status(400).json({
        success: false,
        message: "Invite id is required.",
      });
    }

    await revokeOrganizationInvite(
      actor.userId,
      actor.organization.id,
      inviteId,
    );

    return res.json({
      success: true,
      message: "Invitation revoked.",
    });
  } catch (error) {
    return handleInviteError(error, res);
  }
}
