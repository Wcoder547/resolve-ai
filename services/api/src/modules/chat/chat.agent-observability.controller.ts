import type { Response, Request } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import {
  agentRunParamsSchema,
  listAgentRunsQuerySchema
} from "./chat.agent-observability.validation.js";
import {
  getAgentRunDebug,
  getAgentRunDetail,
  getAgentRunTimeline,
  getAgentRunsSummary,
  listAgentRuns
} from "./chat.agent-observability.service.js";

export async function listAgentRunsController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const query = listAgentRunsQuerySchema.parse(_req.query);

  const result = await listAgentRuns({
    userId: _req.user.id,
    query
  });

  return res.json({
    success: true,
    message: "Agent runs fetched successfully.",
    data: result
  });
}

export async function getAgentRunsSummaryController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const result = await getAgentRunsSummary(_req.user.id);

  return res.json({
    success: true,
    message: "Agent run summary fetched successfully.",
    data: result
  });
}

export async function getAgentRunDetailController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const params = agentRunParamsSchema.parse(_req.params);

  const result = await getAgentRunDetail({
    userId: _req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run detail fetched successfully.",
    data: result
  });
}

export async function getAgentRunTimelineController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const params = agentRunParamsSchema.parse(_req.params);

  const result = await getAgentRunTimeline({
    userId: _req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run timeline fetched successfully.",
    data: result
  });
}

export async function getAgentRunDebugController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const params = agentRunParamsSchema.parse(_req.params);

  const result = await getAgentRunDebug({
    userId: _req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run debug payload fetched successfully.",
    data: result
  });
}