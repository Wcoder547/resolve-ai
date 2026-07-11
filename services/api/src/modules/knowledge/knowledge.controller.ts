import { Response, Request } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  deleteKnowledgeSource,
  getKnowledgeSourceById,
  ingestKnowledgeSource,
  listKnowledgeSources,
  searchKnowledgeChunks,
  uploadKnowledgeSource,
} from "./knowledge.service.js";
import { removeFileQuietly } from "./knowledge.file-utils.js";
import { searchKnowledgeSchema } from "./knowledge.validation.js";
import { enqueueKnowledgeIngestionJob } from "../jobs/knowledge-ingestion.queue.js";
import { getKnowledgeIngestionQueuePayload } from "./knowledge.service.js";

function handleKnowledgeError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten().fieldErrors,
    });
  }

  if (error instanceof Error) {
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.name === "BadRequestError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.name === "ConflictError") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}

export async function uploadKnowledgeSourceController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = req.user?.id;
    const file = req.file;
    const name = typeof req.body.name === "string" ? req.body.name : undefined;

    if (!userId) {
      await removeFileQuietly(file?.path);

      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required. Use form-data field name: file.",
      });
    }

    const result = await uploadKnowledgeSource({
      userId,
      file,
      name,
    });

    const job = await enqueueKnowledgeIngestionJob({
      userId: req.user?.id,
      organizationId: result.source.organizationId,
      sourceId: result.source.id,
      trigger: "UPLOAD",
    });

    return res.status(201).json({
      success: true,
      message:
        "Knowledge source uploaded successfully. Ingestion has been queued.",
      data: {
        ...result,
        ingestion: {
          queued: true,
          jobId: job.id,
          queueName: job.queueName,
        },
      },
    });
  } catch (error) {
    await removeFileQuietly(req.file?.path);
    return handleKnowledgeError(error, res);
  }
}

export async function listKnowledgeSourcesController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = req.user?.id ;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const sources = await listKnowledgeSources(userId);

    return res.json({
      success: true,
      data: {
        sources,
      },
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function getKnowledgeSourceController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = req.user?.id;
    const sourceId =
      typeof req.params.sourceId === "string" ? req.params.sourceId : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Source ID is required.",
      });
    }

    const source = await getKnowledgeSourceById(userId, sourceId);

    return res.json({
      success: true,
      data: {
        source,
      },
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function deleteKnowledgeSourceController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = req.user?.id;
    const sourceId =
      typeof req.params.sourceId === "string" ? req.params.sourceId : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Source ID is required.",
      });
    }

    await deleteKnowledgeSource(userId, sourceId);

    return res.json({
      success: true,
      message: "Knowledge source deleted successfully.",
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function ingestKnowledgeSourceController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const payload = await getKnowledgeIngestionQueuePayload(
   req.user?.id,
   req.params.sourceId
);

const job = await enqueueKnowledgeIngestionJob({
  userId: payload.userId,
  organizationId: payload.organizationId,
  sourceId: payload.sourceId,
  trigger: "MANUAL_RETRY"
});

return res.status(202).json({
  success: true,
  message: "Knowledge source ingestion has been queued.",
  data: {
    sourceId: payload.sourceId,
    previousStatus: payload.status,
    ingestion: {
      queued: true,
      jobId: job.id,
      queueName: job.queueName
    }
  }
});
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}

export async function searchKnowledgeController(
  _req: Request,
  res: Response,
) {
    const req = _req as AuthenticatedRequest;
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const input = searchKnowledgeSchema.parse(req.body);
    const result = await searchKnowledgeChunks(userId, input);

    return res.json({
      success: true,
      message: "Knowledge search completed successfully.",
      data: result,
    });
  } catch (error) {
    return handleKnowledgeError(error, res);
  }
}
