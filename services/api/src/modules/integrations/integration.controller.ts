import type { Response, Request } from "express";
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

function requireStringParam(
  value: string | string[] | undefined,
  paramName: string
): string {
  if (typeof value !== "string") {
    const error = new Error(`Invalid or missing ${paramName}.`);
    error.name = "BadRequestError";
    throw error;
  }
  return value;
}

export async function createIntegrationController(
  _req: Request,
  res: Response
) {
  const req = _req as AuthenticatedRequest;
  const input = createIntegrationSchema.parse(_req.body);
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
  _req: Request,
  res: Response
) {
  const req = _req as AuthenticatedRequest;
  const result = await listIntegrations(req.user.id);
  return res.json({
    success: true,
    message: "Integrations fetched successfully.",
    data: result
  });
}

export async function updateIntegrationStatusController(
  _req: Request,
  res: Response
) {
  const req = _req as AuthenticatedRequest;
  const input = updateIntegrationStatusSchema.parse(_req.body);
  const integrationId = requireStringParam(
    req.params.integrationId,
    "integrationId"
  );

  const integration = await updateIntegrationStatus({
    userId: req.user.id,
    integrationId,
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
  _req: Request,
  res: Response
) {
  const req = _req as AuthenticatedRequest;
  const integrationId = requireStringParam(
    req.params.integrationId,
    "integrationId"
  );

  const result = await deleteIntegration({
    userId: req.user.id,
    integrationId
  });

  return res.json({
    success: true,
    message: "Integration deleted successfully.",
    data: result
  });
}