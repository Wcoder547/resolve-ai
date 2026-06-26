import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env.js";
import {
  moveFileToKnowledgeStorage,
  sanitizeFileName
} from "../knowledge/knowledge.file-utils.js";
import { createR2Client } from "./r2.client.js";
import type {
  StorageAccessResult,
  StoredFileReference,
  StoredFileResult
} from "./storage.types.js";

type SaveKnowledgeFileInput = {
  file: Express.Multer.File;
  organizationId: string;
};

function createStorageKey(input: SaveKnowledgeFileInput) {
  const safeOriginalName = sanitizeFileName(input.file.originalname);

  return [
    "organizations",
    input.organizationId,
    "knowledge",
    `${randomUUID()}-${safeOriginalName}`
  ].join("/");
}

async function saveLocalKnowledgeFile(
  input: SaveKnowledgeFileInput
): Promise<StoredFileResult> {
  const movedFile = await moveFileToKnowledgeStorage(input.file);

  return {
    provider: "LOCAL",
    filePath: movedFile.finalPath,
    storageKey: movedFile.storedFileName,
    storageBucket: null,
    storageRegion: null
  };
}

async function saveR2KnowledgeFile(
  input: SaveKnowledgeFileInput
): Promise<StoredFileResult> {
  const client = createR2Client();
  const storageKey = createStorageKey(input);

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storageKey,
      Body: createReadStream(input.file.path),
      ContentType: input.file.mimetype || "application/octet-stream",
      Metadata: {
        originalName: input.file.originalname,
        sizeBytes: String(input.file.size),
        organizationId: input.organizationId
      }
    })
  );

  await fs.unlink(input.file.path).catch(() => null);

  return {
    provider: "R2",
    filePath: null,
    storageKey,
    storageBucket: env.R2_BUCKET_NAME,
    storageRegion: "auto"
  };
}

export async function saveKnowledgeFileToStorage(
  input: SaveKnowledgeFileInput
): Promise<StoredFileResult> {
  if (env.STORAGE_PROVIDER === "r2") {
    return saveR2KnowledgeFile(input);
  }

  return saveLocalKnowledgeFile(input);
}

export async function deleteKnowledgeFileFromStorage(
  file: StoredFileReference
) {
  if (file.storageProvider === "R2") {
    if (!file.storageKey) return;

    const client = createR2Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: file.storageBucket || env.R2_BUCKET_NAME,
        Key: file.storageKey
      })
    );

    return;
  }

  if (file.filePath) {
    await fs.unlink(file.filePath).catch(() => null);
  }
}

export async function getKnowledgeFileAccess(
  file: StoredFileReference
): Promise<StorageAccessResult> {
  if (file.storageProvider === "R2") {
    if (!file.storageKey) {
      const error = new Error("R2 storage key is missing.");
      error.name = "BadRequestError";
      throw error;
    }

    const client = createR2Client();

    const command = new GetObjectCommand({
      Bucket: file.storageBucket || env.R2_BUCKET_NAME,
      Key: file.storageKey
    });

    const fileUrl = await getSignedUrl(client, command, {
      expiresIn: env.R2_PRESIGNED_URL_EXPIRES_SECONDS
    });

    return {
      fileUrl
    };
  }

  if (!file.filePath) {
    const error = new Error("Local file path is missing.");
    error.name = "BadRequestError";
    throw error;
  }

  return {
    filePath: path.resolve(file.filePath)
  };
}