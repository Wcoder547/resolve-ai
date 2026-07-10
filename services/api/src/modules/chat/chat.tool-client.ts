import { env } from "../../config/env.js";
import { getEnv } from "../../utils/env.js";

export type ApprovedToolExecutionResponse = {
  success: boolean;
  message: string;
  data: {
    toolCallId?: string | null;
    toolName: string;
    toolCategory: string;
    requiresApproval: boolean;
    approvalStatus: string;
    status: string;
    reason?: string | null;
    latencyMs: number;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    error?: string | null;
  };
};

function createToolExecutionError(message: string, name = "ToolExecutionError") {
  const error = new Error(message);
  error.name = name;
  return error;
}

export async function executeApprovedTool(input: {
  toolCallId: string;
  toolName: string;
  reason?: string | null;
  toolInput: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const aiServiceUrl = getEnv("AI_SERVICE_URL");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.AGENT_TOOL_EXECUTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${aiServiceUrl}/ai/tools/execute-approved`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        toolCallId: input.toolCallId,
        toolName: input.toolName,
        reason: input.reason || null,
        input: input.toolInput,
        metadata: input.metadata || {}
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data.detail === "string"
          ? data.detail
          : data && typeof data.message === "string"
            ? data.message
            : "Approved tool execution failed.";

      throw createToolExecutionError(message);
    }

    return data as ApprovedToolExecutionResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createToolExecutionError(
        "Approved tool execution timed out.",
        "ToolExecutionTimeoutError"
      );
    }

    if (error instanceof Error) {
      throw createToolExecutionError(error.message);
    }

    throw createToolExecutionError("Unknown approved tool execution error.");
  } finally {
    clearTimeout(timeout);
  }
}