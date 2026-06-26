import { createHash, randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromFile } from "file-type";
import {
  ALLOWED_FILE_TYPE_MIME_BY_EXTENSION,
  ALLOWED_KNOWLEDGE_EXTENSIONS,
  TEXT_EXTENSIONS
} from "./knowledge.constants.js";

export function getUploadDirectories() {
  const rootUploadDir = path.join(process.cwd(), "uploads");
  const temporaryUploadDir = path.join(rootUploadDir, "tmp");
  const knowledgeUploadDir = path.join(rootUploadDir, "knowledge");

  return {
    rootUploadDir,
    temporaryUploadDir,
    knowledgeUploadDir
  };
}

export async function ensureUploadDirectories() {
  const { temporaryUploadDir, knowledgeUploadDir } = getUploadDirectories();

  await fs.mkdir(temporaryUploadDir, {
    recursive: true
  });

  await fs.mkdir(knowledgeUploadDir, {
    recursive: true
  });
}

export function getFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function sanitizeFileName(fileName: string) {
  const extension = getFileExtension(fileName);

  const baseName = path
    .basename(fileName, extension)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);

  return `${baseName || "document"}${extension}`;
}

export function isAllowedKnowledgeExtension(fileName: string) {
  return ALLOWED_KNOWLEDGE_EXTENSIONS.has(getFileExtension(fileName));
}

export async function createFileHash(filePath: string) {
  const buffer = await fs.readFile(filePath);

  return createHash("sha256").update(buffer).digest("hex");
}

export async function removeFileQuietly(filePath?: string | null) {
  if (!filePath) return;

  await fs.unlink(filePath).catch(() => null);
}

async function validateTextFile(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const sample = buffer.subarray(0, 4096);

  if (sample.includes(0)) {
    const error = new Error("Text file appears to contain binary data.");
    error.name = "BadRequestError";
    throw error;
  }

  const text = buffer.toString("utf-8").trim();

  if (!text) {
    const error = new Error("Uploaded text document is empty.");
    error.name = "BadRequestError";
    throw error;
  }
}

async function validateBinaryDocumentSignature(
  filePath: string,
  extension: string
) {
  const detectedType = await fileTypeFromFile(filePath);
  const allowedMimes = ALLOWED_FILE_TYPE_MIME_BY_EXTENSION[extension] || [];

  if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
    const error = new Error(
      `Invalid file content for ${extension}. File extension and actual file type do not match.`
    );
    error.name = "BadRequestError";
    throw error;
  }
}

export async function validateKnowledgeUpload(file: Express.Multer.File) {
  const extension = getFileExtension(file.originalname);

  if (!ALLOWED_KNOWLEDGE_EXTENSIONS.has(extension)) {
    const error = new Error(
      "Unsupported file type. Allowed files: PDF, TXT, MD, MARKDOWN, DOCX."
    );
    error.name = "BadRequestError";
    throw error;
  }

  if (!file.size || file.size <= 0) {
    const error = new Error("Uploaded file is empty.");
    error.name = "BadRequestError";
    throw error;
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    await validateTextFile(file.path);
    return;
  }

  await validateBinaryDocumentSignature(file.path, extension);
}

export async function moveFileToKnowledgeStorage(file: Express.Multer.File) {
  const { knowledgeUploadDir } = getUploadDirectories();

  await fs.mkdir(knowledgeUploadDir, {
    recursive: true
  });

  const safeOriginalName = sanitizeFileName(file.originalname);
  const storedFileName = `${randomUUID()}-${safeOriginalName}`;
  const finalPath = path.join(knowledgeUploadDir, storedFileName);

  await fs.rename(file.path, finalPath);

  return {
    finalPath,
    storedFileName,
    safeOriginalName
  };
}