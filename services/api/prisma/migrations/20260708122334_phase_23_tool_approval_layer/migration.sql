/*
  Warnings:

  - Added the required column `updatedAt` to the `AgentToolCall` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AgentToolApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED');

-- AlterTable
ALTER TABLE "AgentToolCall" ADD COLUMN     "approvalStatus" "AgentToolApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "executedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedByUserId" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toolCategory" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "AgentToolCall_approvalStatus_idx" ON "AgentToolCall"("approvalStatus");

-- CreateIndex
CREATE INDEX "AgentToolCall_requiresApproval_idx" ON "AgentToolCall"("requiresApproval");
