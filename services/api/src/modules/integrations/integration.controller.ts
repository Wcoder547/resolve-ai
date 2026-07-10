import type { Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  updateIntegrationStatus
} from "./integration.service.js";
import {
  createIntegrationSchema,
  updateIntegrationStatusSchema
} from "./integration.validation.js";

export async function createIntegrationController(
  req: AuthenticatedRequest,
  res: Response
) {
  const input = createIntegrationSchema.parse(req.body);

  const integration = await createIntegration(req.user.id, input);

  return res.status(201).json({
    success: true,
    message: "Integration created successfully.",
    data: {
      integration
    }
  });
}

export async function listIntegrationsController(
  req: AuthenticatedRequest,
  res: Response
) {
  const result = await listIntegrations(req.user.id);

  return res.json({
    success: true,
    message: "Integrations fetched successfully.",
    data: result
  });
}

export async function updateIntegrationStatusController(
  req: AuthenticatedRequest,
  res: Response
) {
  const input = updateIntegrationStatusSchema.parse(req.body);

  const integration = await updateIntegrationStatus({
    userId: req.user.id,
    integrationId: req.params.integrationId,
    status: input.status
  });

  return res.json({
    success: true,
    message: "Integration status updated successfully.",
    data: {
      integration
    }
  });
}

export async function deleteIntegrationController(
  req: AuthenticatedRequest,
  res: Response
) {
  const result = await deleteIntegration({
    userId: req.user.id,
    integrationId: req.params.integrationId
  });

  return res.json({
    success: true,
    message: "Integration deleted successfully.",
    data: result
  });
}