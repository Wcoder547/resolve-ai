import type { Response, Request } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import {
  approveAgentToolCall,
  listPendingAgentToolCalls,
  rejectAgentToolCall
} from "./chat.tool-approval.service.js";
import { rejectToolCallSchema } from "./chat.tool-approval.validation.js";

export async function listPendingAgentToolCallsController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const result = await listPendingAgentToolCalls(req.user.id);

  return res.json({
    success: true,
    message: "Pending agent tool calls fetched successfully.",
    data: result
  });
}

export async function approveAgentToolCallController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const toolCallId =
    typeof _req.params.toolCallId === "string" ? _req.params.toolCallId : undefined;

  if (!toolCallId) {
    return res.status(400).json({
      success: false,
      message: "Tool call ID is required."
    });
  }

  const result = await approveAgentToolCall({
    userId: req.user.id,
    toolCallRecordId: toolCallId
  });

  return res.json({
    success: true,
    message: "Agent tool call approved and executed successfully.",
    data: result
  });
}

export async function rejectAgentToolCallController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const toolCallId =
    typeof _req.params.toolCallId === "string" ? _req.params.toolCallId : undefined;

  if (!toolCallId) {
    return res.status(400).json({
      success: false,
      message: "Tool call ID is required."
    });
  }

  const input = rejectToolCallSchema.parse(_req.body);

  const result = await rejectAgentToolCall({
    userId: req.user.id,
    toolCallRecordId: toolCallId,
    reason: input.reason
  });

  return res.json({
    success: true,
    message: "Agent tool call rejected successfully.",
    data: result
  });
}
