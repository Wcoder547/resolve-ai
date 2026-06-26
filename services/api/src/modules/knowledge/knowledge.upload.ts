import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import {
  ensureUploadDirectories,
  getUploadDirectories,
  isAllowedKnowledgeExtension,
  sanitizeFileName
} from "./knowledge.file-utils.js";

await ensureUploadDirectories();

const { temporaryUploadDir } = getUploadDirectories();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, temporaryUploadDir);
  },

  filename: (_req, file, callback) => {
    const safeOriginalName = sanitizeFileName(file.originalname);
    const fileName = `${Date.now()}-${safeOriginalName}`;

    callback(null, fileName);
  }
});

const uploadKnowledgeFile = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedKnowledgeExtension(file.originalname)) {
      callback(
        new Error("Unsupported file type. Allowed: PDF, TXT, MD, MARKDOWN, DOCX.")
      );
      return;
    }

    callback(null, true);
  }
});

export function handleKnowledgeFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  uploadKnowledgeFile.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "File upload failed."
      });
    }

    next();
  });
}