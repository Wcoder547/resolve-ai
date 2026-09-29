-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "toolCallId" TEXT,
    "toolName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "latencyMs" INTEGER,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentToolCall_agentRunId_idx" ON "AgentToolCall"("agentRunId");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_idx" ON "AgentToolCall"("toolName");

-- CreateIndex
CREATE INDEX "AgentToolCall_status_idx" ON "AgentToolCall"("status");

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
