import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  deleteKnowledgeFileFromStorage,
  getKnowledgeFileAccess,
} from "./storage.service.js";

describe("Storage helpers", () => {
  it("resolves local file access and deletes local files", async () => {
    const tempFile = path.join(
      os.tmpdir(),
      `resolveai-storage-test-${Date.now()}.txt`,
    );
    await fs.writeFile(tempFile, "storage-test");

    const access = await getKnowledgeFileAccess({
      storageProvider: "LOCAL",
      filePath: tempFile,
      storageKey: null,
      storageBucket: null,
      storageRegion: null,
    });

    expect(access.filePath).toBe(path.resolve(tempFile));

    await deleteKnowledgeFileFromStorage({
      storageProvider: "LOCAL",
      filePath: tempFile,
      storageKey: null,
      storageBucket: null,
      storageRegion: null,
    });

    await expect(fs.access(tempFile)).rejects.toBeTruthy();
  });

  it("rejects R2 access when storage key is missing", async () => {
    await expect(
      getKnowledgeFileAccess({
        storageProvider: "R2",
        filePath: null,
        storageKey: null,
        storageBucket: "resolveai-knowledge",
        storageRegion: "auto",
      }),
    ).rejects.toMatchObject({ name: "BadRequestError" });
  });
});
