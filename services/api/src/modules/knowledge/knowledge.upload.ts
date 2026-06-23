import { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads", "knowledge");

fs.mkdirSync(uploadDir, {
  recursive: true
});

const allowedExtensions = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".docx"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },

  filename: (_req, file, callback) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeOriginalName}`;

    callback(null, fileName);
  }
});

const uploadKnowledgeFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
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