-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_idx" ON "AuditLog"("organizationId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_userId_idx" ON "Conversation"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_updatedAt_idx" ON "Conversation"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Document_organizationId_contentHash_idx" ON "Document"("organizationId", "contentHash");

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentChunk_organizationId_documentId_idx" ON "DocumentChunk"("organizationId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentChunk_organizationId_createdAt_idx" ON "DocumentChunk"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_status_idx" ON "KnowledgeSource"("organizationId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_type_idx" ON "KnowledgeSource"("organizationId", "type");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_createdAt_idx" ON "KnowledgeSource"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSource_storageProvider_idx" ON "KnowledgeSource"("storageProvider");

-- CreateIndex
CREATE INDEX "KnowledgeSource_storageKey_idx" ON "KnowledgeSource"("storageKey");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_organizationId_createdAt_idx" ON "Message"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_organizationId_role_idx" ON "Message"("organizationId", "role");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_idx" ON "RefreshToken"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- Enable trigram extension for faster ILIKE fallback search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search index for RAG search
CREATE INDEX IF NOT EXISTS "DocumentChunk_chunkText_fts_idx"
ON "DocumentChunk"
USING GIN (to_tsvector('english', "chunkText"));

-- Trigram index for fallback ILIKE search
CREATE INDEX IF NOT EXISTS "DocumentChunk_chunkText_trgm_idx"
ON "DocumentChunk"
USING GIN ("chunkText" gin_trgm_ops);

-- Helpful index for searching completed knowledge sources by organization
CREATE INDEX IF NOT EXISTS "KnowledgeSource_org_status_createdAt_idx"
ON "KnowledgeSource" ("organizationId", "status", "createdAt" DESC);

-- Helpful index for conversation history sidebar
CREATE INDEX IF NOT EXISTS "Conversation_org_user_updatedAt_idx"
ON "Conversation" ("organizationId", "userId", "updatedAt" DESC);

-- Helpful index for loading messages in a conversation
CREATE INDEX IF NOT EXISTS "Message_conversation_createdAt_idx"
ON "Message" ("conversationId", "createdAt" ASC);