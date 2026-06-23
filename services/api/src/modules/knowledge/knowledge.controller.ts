import { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  deleteKnowledgeSource,
  getKnowledgeSourceById,
  ingestKnowledgeSource,
  listKnowledgeSources,
  searchKnowledgeChunks,
  uploadKnowledgeSource
} from "./knowledge.service.js";

import { z } from "zod";
import { searchKnowledgeSchema } from "./knowledge.validation.js";

function handleKnowledgeError(error: unknown, res: Response) {
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

    if (error.name === "BadRequestError") {
      return res.status(400).json({
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
export async function uploadKnowledgeSourceController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const file = req.file;
    const name = typeof req.body.name === "string" ? req.body.name : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required. Use form-data field name: file."
      });
    }

    const result = await uploadKnowledgeSource({
      userId,
      file,
      name
    });

    return res.status(201).json({
      success: true,
      message: "Knowledge source uploaded successfully.",
      data: result
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function listKnowledgeSourcesController(
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

    const sources = await listKnowledgeSources(userId);

    return res.json({
      success: true,
      data: {
        sources
      }
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function getKnowledgeSourceController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const sourceId =
  typeof req.params.sourceId === "string" ? req.params.sourceId : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Source ID is required."
      });
    }

    const source = await getKnowledgeSourceById(userId, sourceId);

    return res.json({
      success: true,
      data: {
        source
      }
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function deleteKnowledgeSourceController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const sourceId =
  typeof req.params.sourceId === "string" ? req.params.sourceId : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Source ID is required."
      });
    }

    await deleteKnowledgeSource(userId, sourceId);

    return res.json({
      success: true,
      message: "Knowledge source deleted successfully."
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}


export async function ingestKnowledgeSourceController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const sourceId =
  typeof req.params.sourceId === "string" ? req.params.sourceId : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized."
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Source ID is required."
      });
    }

    const result = await ingestKnowledgeSource(userId, sourceId);

    return res.json({
      success: true,
      message: "Knowledge source ingested successfully.",
      data: result
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}


export async function searchKnowledgeController(
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

    const input = searchKnowledgeSchema.parse(req.body);
    const result = await searchKnowledgeChunks(userId, input);

    return res.json({
      success: true,
      message: "Knowledge search completed successfully.",
      data: result
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}