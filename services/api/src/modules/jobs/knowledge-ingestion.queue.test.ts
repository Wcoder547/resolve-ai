import { beforeEach, describe, expect, it, vi } from "vitest";

const addMock = vi.fn(async () => ({
  id: "queued-job-1",
  name: "ingest-knowledge-source",
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: addMock,
  })),
}));

vi.mock("../../lib/redis.js", () => ({
  createRedisConnection: () => ({}),
}));

describe("Knowledge ingestion queue", () => {
  beforeEach(() => {
    addMock.mockClear();
    vi.resetModules();
  });

  it("enqueues a knowledge ingestion job payload", async () => {
    const { enqueueKnowledgeIngestionJob } = await import(
      "./knowledge-ingestion.queue.js"
    );

    const result = await enqueueKnowledgeIngestionJob({
      sourceId: "source-1",
      userId: "user-1",
      organizationId: "org-1",
      trigger: "UPLOAD",
    });

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(
      "ingest-knowledge-source",
      expect.objectContaining({
        sourceId: "source-1",
        userId: "user-1",
        organizationId: "org-1",
        trigger: "UPLOAD",
      }),
      expect.any(Object),
    );
    expect(result.id).toBe("queued-job-1");
    expect(result.queueName).toBeTruthy();
  });
});
