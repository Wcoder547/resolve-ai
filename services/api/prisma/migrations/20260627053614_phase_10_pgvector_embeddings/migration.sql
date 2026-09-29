CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embedding" vector(384),
ADD COLUMN     "embeddingDimensions" INTEGER,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingProvider" TEXT;

-- CreateIndex
CREATE INDEX "DocumentChunk_embeddedAt_idx" ON "DocumentChunk"("embeddedAt");

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_hnsw_idx"
ON "DocumentChunk"
USING hnsw ("embedding" vector_cosine_ops)
WHERE "embedding" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_org_idx"
ON "DocumentChunk" ("organizationId")
WHERE "embedding" IS NOT NULL;