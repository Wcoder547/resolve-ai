import { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { askQuestionSchema } from "./chat.validation.js";
import {
  askRagQuestion,
  deleteChatConversation,
  getChatConversationById,
  listChatConversations
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
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    const input = askQuestionSchema.parse(req.body);
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


export async function listConversationsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

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
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const conversationId =
      typeof req.params.conversationId === "string"
        ? req.params.conversationId
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
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const conversationId =
      typeof req.params.conversationId === "string"
        ? req.params.conversationId
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