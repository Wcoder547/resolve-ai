import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import type { AuthenticatedRequest } from "../../types/express.js";

import {
  askQuestionController,
  deleteConversationController,
  getConversationController,
  listConversationsController,
} from "./chat.controller.js";

import { askAgenticQuestionController } from "./chat.agent.controller.js";

import {
  getAgentRunDebugController,
  getAgentRunDetailController,
  getAgentRunTimelineController,
  getAgentRunsSummaryController,
  listAgentRunsController,
} from "./chat.agent-observability.controller.js";

import {
  approveAgentToolCallController,
  listPendingAgentToolCallsController,
  rejectAgentToolCallController,
} from "./chat.tool-approval.controller.js";

import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";

const router = Router();

type AuthenticatedRouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => unknown;

function authenticatedRoute(handler: AuthenticatedRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(handler(req as AuthenticatedRequest, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

router.use(requireAuth);

router.post(
  "/ask",
  requirePermission(PERMISSIONS.CHAT_ASK),
  authenticatedRoute(askQuestionController)
);

router.post(
  "/agent/ask",
  requirePermission(PERMISSIONS.CHAT_ASK),
  authenticatedRoute(askAgenticQuestionController)
);

router.get(
  "/agent/tool-calls/pending",
  requirePermission(PERMISSIONS.AGENT_TOOL_APPROVE),
  authenticatedRoute(listPendingAgentToolCallsController)
);

router.post(
  "/agent/tool-calls/:toolCallId/approve",
  requirePermission(PERMISSIONS.AGENT_TOOL_APPROVE),
  authenticatedRoute(approveAgentToolCallController)
);

router.post(
  "/agent/tool-calls/:toolCallId/reject",
  requirePermission(PERMISSIONS.AGENT_TOOL_APPROVE),
  authenticatedRoute(rejectAgentToolCallController)
);

router.get(
  "/agent/runs/summary",
  requirePermission(PERMISSIONS.AGENT_RUN_READ),
  authenticatedRoute(getAgentRunsSummaryController)
);

router.get(
  "/agent/runs",
  requirePermission(PERMISSIONS.AGENT_RUN_READ),
  authenticatedRoute(listAgentRunsController)
);

router.get(
  "/agent/runs/:agentRunId",
  requirePermission(PERMISSIONS.AGENT_RUN_READ),
  authenticatedRoute(getAgentRunDetailController)
);

router.get(
  "/agent/runs/:agentRunId/timeline",
  requirePermission(PERMISSIONS.AGENT_RUN_READ),
  authenticatedRoute(getAgentRunTimelineController)
);

router.get(
  "/agent/runs/:agentRunId/debug",
  requirePermission(PERMISSIONS.AGENT_RUN_DEBUG),
  authenticatedRoute(getAgentRunDebugController)
);

router.get(
  "/conversations",
  requirePermission(PERMISSIONS.CHAT_READ),
  authenticatedRoute(listConversationsController)
);

router.get(
  "/conversations/:conversationId",
  requirePermission(PERMISSIONS.CHAT_READ),
  authenticatedRoute(getConversationController)
);

router.delete(
  "/conversations/:conversationId",
  requirePermission(PERMISSIONS.CHAT_DELETE),
  authenticatedRoute(deleteConversationController)
);

export default router;
