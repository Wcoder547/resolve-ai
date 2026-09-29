import type { Request, Response } from "express";
import {
  listNotificationPreferences,
  updateNotificationPreferences,
} from "./organization-notification.service.js";
import { updateNotificationPreferencesSchema } from "./organization-notification.validation.js";
import {
  handleOrganizationError,
  requireActor,
} from "./organization.controller.js";

export async function listNotificationPreferencesController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const preferences = await listNotificationPreferences(
      actor.userId,
      actor.organization.id,
    );

    return res.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function updateNotificationPreferencesController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const input = updateNotificationPreferencesSchema.parse(req.body);
    const preferences = await updateNotificationPreferences(
      actor.userId,
      actor.organization.id,
      input,
    );

    return res.json({
      success: true,
      message: "Notification preferences saved.",
      data: { preferences },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}
