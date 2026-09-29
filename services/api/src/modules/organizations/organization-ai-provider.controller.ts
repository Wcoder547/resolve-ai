import type { Request, Response } from "express";
import {
  deleteOrganizationAiProvider,
  listOrganizationAiProviders,
  setDefaultOrganizationAiProvider,
  testOrganizationAiProvider,
  upsertOrganizationAiProvider,
} from "./organization-ai-provider.service.js";
import {
  aiProviderParamsSchema,
  upsertAiProviderSchema,
} from "./organization-ai-provider.validation.js";
import {
  handleOrganizationError,
  requireActor,
} from "./organization.controller.js";

function providerFromParams(req: Request) {
  const raw = Array.isArray(req.params.provider)
    ? req.params.provider[0]
    : req.params.provider;
  return aiProviderParamsSchema.parse({ provider: raw }).provider;
}

export async function listOrganizationAiProvidersController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const providers = await listOrganizationAiProviders(actor.organization.id);
    return res.json({
      success: true,
      data: { providers },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function upsertOrganizationAiProviderController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const provider = providerFromParams(req);
    const input = upsertAiProviderSchema.parse(req.body);
    const saved = await upsertOrganizationAiProvider(
      actor.userId,
      actor.organization.id,
      provider,
      input,
    );

    return res.json({
      success: true,
      message: saved.connected ? "Provider saved." : "Provider updated.",
      data: { provider: saved },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function setDefaultOrganizationAiProviderController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const provider = providerFromParams(req);
    const providers = await setDefaultOrganizationAiProvider(
      actor.userId,
      actor.organization.id,
      provider,
    );

    return res.json({
      success: true,
      message: "Default provider updated.",
      data: { providers },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function testOrganizationAiProviderController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const provider = providerFromParams(req);
    const saved = await testOrganizationAiProvider(
      actor.userId,
      actor.organization.id,
      provider,
    );

    return res.json({
      success: true,
      message: "Provider key is stored and readable.",
      data: { provider: saved },
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}

export async function deleteOrganizationAiProviderController(
  req: Request,
  res: Response,
) {
  const actor = requireActor(req, res);
  if (!actor) return;

  try {
    const provider = providerFromParams(req);
    await deleteOrganizationAiProvider(
      actor.userId,
      actor.organization.id,
      provider,
    );

    return res.json({
      success: true,
      message: "Provider disconnected.",
    });
  } catch (error) {
    return handleOrganizationError(error, res);
  }
}
