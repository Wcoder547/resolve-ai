import { env } from "../../config/env.js";
import { assertSafeOutboundUrl } from "../../lib/url-safety.js";

function createIntegrationExecutionError(message: string) {
  const error = new Error(message);
  error.name = "IntegrationExecutionError";
  return error;
}

export async function postJsonWithTimeout(input: {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, env.INTEGRATION_HTTP_TIMEOUT_MS);
   const safeUrl = await assertSafeOutboundUrl(input.url);
  try {
    const response = await fetch(safeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.headers || {})
      },
      body: JSON.stringify(input.payload),
      signal: controller.signal
    });

    const responseText = await response.text();

    let responseBody: unknown = responseText;

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = {
        raw: responseText
      };
    }

    if (!response.ok) {
      throw createIntegrationExecutionError(
        `External integration failed with status ${response.status}.`
      );
    }

    return {
      statusCode: response.status,
      body: responseBody
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createIntegrationExecutionError("External integration timed out.");
    }

    if (error instanceof Error) {
      throw createIntegrationExecutionError(error.message);
    }

    throw createIntegrationExecutionError("Unknown external integration error.");
  } finally {
    clearTimeout(timeout);
  }
}