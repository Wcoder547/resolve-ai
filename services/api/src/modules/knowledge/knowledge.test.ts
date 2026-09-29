import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import {
  API_PREFIX,
  registerAndLoginTestUser,
} from "../../test/test-helpers.js";

vi.mock("../jobs/knowledge-ingestion.queue.js", () => ({
  enqueueKnowledgeIngestionJob: vi.fn(async (input: { sourceId: string }) => ({
    id: `job-${input.sourceId}`,
    name: "ingest-knowledge-source",
    queueName: "knowledge-ingestion",
  })),
  knowledgeIngestionQueue: {
    add: vi.fn(),
  },
}));

describe("Knowledge API", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  async function seedCompletedSource(input: {
    organizationId: string;
    userId: string;
    chunkText?: string;
  }) {
    const source = await prisma.knowledgeSource.create({
      data: {
        organizationId: input.organizationId,
        createdByUserId: input.userId,
        type: "FILE",
        name: "Refund Policy",
        status: "COMPLETED",
        mimeType: "text/plain",
        sizeBytes: 120,
      },
    });

    const document = await prisma.document.create({
      data: {
        organizationId: input.organizationId,
        sourceId: source.id,
        title: "Refund Policy",
      },
    });

    const chunk = await prisma.documentChunk.create({
      data: {
        organizationId: input.organizationId,
        documentId: document.id,
        chunkIndex: 0,
        chunkText:
          input.chunkText ||
          "Customers can request a full refund within 14 days of purchase.",
        tokenCount: 20,
      },
    });

    return { source, document, chunk };
  }

  it("lists sources and blocks VIEWER from upload", async () => {
    const owner = await registerAndLoginTestUser({ role: "OWNER" });
    await seedCompletedSource({
      organizationId: owner.membership.organizationId,
      userId: owner.user.id,
    });

    const list = await request(app)
      .get(`${API_PREFIX}/knowledge/`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.sources.length).toBeGreaterThanOrEqual(1);

    const viewer = await registerAndLoginTestUser({ role: "VIEWER" });
    const blocked = await request(app)
      .post(`${API_PREFIX}/knowledge/upload`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .attach("file", Buffer.from("hello knowledge"), "notes.txt");

    expect(blocked.status).toBe(403);
  });

  it("gets source detail and returns 404 for unknown ids", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser();
    const { source } = await seedCompletedSource({
      organizationId: membership.organizationId,
      userId: user.id,
    });

    const detail = await request(app)
      .get(`${API_PREFIX}/knowledge/${source.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.source.id).toBe(source.id);

    const missing = await request(app)
      .get(`${API_PREFIX}/knowledge/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(missing.status).toBe(404);
  });

  it("uploads a text file and queues ingestion", async () => {
    const { accessToken } = await registerAndLoginTestUser({ role: "OWNER" });

    const response = await request(app)
      .post(`${API_PREFIX}/knowledge/upload`)
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "Onboarding Guide")
      .attach(
        "file",
        Buffer.from("Welcome to ResolveAI onboarding documentation."),
        "onboarding.txt",
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.ingestion.queued).toBe(true);
    expect(response.body.data.ingestion.jobId).toBeTruthy();
    expect(response.body.data.source.status).toBeTruthy();
  });

  it("queues manual ingest with 202", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser({
      role: "OWNER",
    });

    const source = await prisma.knowledgeSource.create({
      data: {
        organizationId: membership.organizationId,
        createdByUserId: user.id,
        type: "FILE",
        name: "Manual Ingest",
        status: "FAILED",
        mimeType: "text/plain",
        sizeBytes: 10,
        filePath: "/tmp/does-not-need-to-exist-for-queue.txt",
      },
    });

    const response = await request(app)
      .post(`${API_PREFIX}/knowledge/${source.id}/ingest`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(202);
    expect(response.body.data.ingestion.queued).toBe(true);
    expect(response.body.data.sourceId).toBe(source.id);
  });

  it("searches completed knowledge chunks", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser();
    await seedCompletedSource({
      organizationId: membership.organizationId,
      userId: user.id,
      chunkText: "Refund policy allows returns within fourteen days.",
    });

    const response = await request(app)
      .post(`${API_PREFIX}/knowledge/search`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: "refund policy returns",
        limit: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.chunks)).toBe(true);
  });

  it("deletes a knowledge source", async () => {
    const { accessToken, membership, user } = await registerAndLoginTestUser({
      role: "OWNER",
    });
    const { source } = await seedCompletedSource({
      organizationId: membership.organizationId,
      userId: user.id,
    });

    const response = await request(app)
      .delete(`${API_PREFIX}/knowledge/${source.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const missing = await prisma.knowledgeSource.findUnique({
      where: { id: source.id },
    });
    expect(missing).toBeNull();
  });
});
