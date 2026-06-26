-- DropIndex
DROP INDEX "AuditLog_organizationId_action_idx";

-- DropIndex
DROP INDEX "AuditLog_organizationId_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- DropIndex
DROP INDEX "Conversation_organizationId_userId_idx";

-- DropIndex
DROP INDEX "KnowledgeSource_storageKey_idx";

-- DropIndex
DROP INDEX "KnowledgeSource_storageProvider_idx";

-- DropIndex
DROP INDEX "Message_organizationId_role_idx";

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_userId_updatedAt_idx" ON "Conversation"("organizationId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_createdAt_idx" ON "OrganizationMember"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId", "role");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- Phase 6: RAG full-text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "DocumentChunk_chunkText_fts_idx"
ON "DocumentChunk"
USING GIN (to_tsvector('english', "chunkText"));

CREATE INDEX IF NOT EXISTS "DocumentChunk_chunkText_trgm_idx"
ON "DocumentChunk"
USING GIN ("chunkText" gin_trgm_ops);