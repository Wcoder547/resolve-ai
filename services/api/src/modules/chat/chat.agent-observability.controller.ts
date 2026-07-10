import type { Response } from "express";
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
  req: AuthenticatedRequest,
  res: Response
) {
  const query = listAgentRunsQuerySchema.parse(req.query);

  const result = await listAgentRuns({
    userId: req.user.id,
    query
  });

  return res.json({
    success: true,
    message: "Agent runs fetched successfully.",
    data: result
  });
}

export async function getAgentRunsSummaryController(
  req: AuthenticatedRequest,
  res: Response
) {
  const result = await getAgentRunsSummary(req.user.id);

  return res.json({
    success: true,
    message: "Agent run summary fetched successfully.",
    data: result
  });
}

export async function getAgentRunDetailController(
  req: AuthenticatedRequest,
  res: Response
) {
  const params = agentRunParamsSchema.parse(req.params);

  const result = await getAgentRunDetail({
    userId: req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run detail fetched successfully.",
    data: result
  });
}

export async function getAgentRunTimelineController(
  req: AuthenticatedRequest,
  res: Response
) {
  const params = agentRunParamsSchema.parse(req.params);

  const result = await getAgentRunTimeline({
    userId: req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run timeline fetched successfully.",
    data: result
  });
}

export async function getAgentRunDebugController(
  req: AuthenticatedRequest,
  res: Response
) {
  const params = agentRunParamsSchema.parse(req.params);

  const result = await getAgentRunDebug({
    userId: req.user.id,
    agentRunId: params.agentRunId
  });

  return res.json({
    success: true,
    message: "Agent run debug payload fetched successfully.",
    data: result
  });
}