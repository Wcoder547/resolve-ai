import { Response, Request } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { askQuestionSchema } from "./chat.validation.js";
import {
  askRagQuestion,
  deleteChatConversation,
  getChatConversationById,
  listChatConversations,
  streamRagQuestion,
} from "./chat.service.js";

function handleChatError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten().fieldErrors
    });
  }

  if (error instanceof Error) {
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
}

export async function askQuestionController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = _req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    const input = askQuestionSchema.parse(_req.body);
    const result = await askRagQuestion(userId, input);

    return res.json({
      success: true,
      message: "RAG answer generated successfully.",
      data: result
    });
  } catch (error) {
    return handleChatError(error, res);
  }
}

export async function streamAskQuestionController(
  _req: Request,
  res: Response,
) {
  const req = _req as AuthenticatedRequest;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  let input;
  try {
    input = askQuestionSchema.parse(req.body);
  } catch (error) {
    return handleChatError(error, res);
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  const onClose = () => abortController.abort();
  req.on("close", onClose);

  const writeEvent = (event: unknown) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    const flushable = res as Response & { flush?: () => void };
    flushable.flush?.();
  };

  try {
    for await (const event of streamRagQuestion(userId, input, {
      signal: abortController.signal,
    })) {
      writeEvent(event);
    }
  } catch (error) {
    writeEvent({
      type: "error",
      message:
        error instanceof Error ? error.message : "Internal server error.",
    });
  } finally {
    req.off("close", onClose);
    if (!res.writableEnded) {
      res.end();
    }
  }
}

export async function listConversationsController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = _req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    const conversations = await listChatConversations(userId);

    return res.json({
      success: true,
      data: {
        conversations
      }
    });
  } catch (error) {
    return handleChatError(error, res);
  }
}

export async function getConversationController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = _req.user?.userId;
    const conversationId =
      typeof _req.params.conversationId === "string"
        ? _req.params.conversationId
        : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required."
      });
    }

    const conversation = await getChatConversationById(userId, conversationId);

    return res.json({
      success: true,
      data: {
        conversation
      }
    });
  } catch (error) {
    return handleChatError(error, res);
  }
}

export async function deleteConversationController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = _req.user?.userId;
    const conversationId =
      typeof _req.params.conversationId === "string"
        ? _req.params.conversationId
        : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required."
      });
    }

    await deleteChatConversation(userId, conversationId);

    return res.json({
      success: true,
      message: "Conversation deleted successfully."
    });
  } catch (error) {
    return handleChatError(error, res);
  }
}