-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SLACK_WEBHOOK', 'TICKETING_WEBHOOK', 'GENERIC_WEBHOOK');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "OrganizationIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "encryptedCredentials" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationExecutionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationIntegration_organizationId_idx" ON "OrganizationIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationIntegration_organizationId_provider_idx" ON "OrganizationIntegration"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "OrganizationIntegration_organizationId_status_idx" ON "OrganizationIntegration"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IntegrationExecutionLog_organizationId_createdAt_idx" ON "IntegrationExecutionLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationExecutionLog_integrationId_idx" ON "IntegrationExecutionLog"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationExecutionLog_provider_idx" ON "IntegrationExecutionLog"("provider");

-- CreateIndex
CREATE INDEX "IntegrationExecutionLog_status_idx" ON "IntegrationExecutionLog"("status");

-- AddForeignKey
ALTER TABLE "OrganizationIntegration" ADD CONSTRAINT "OrganizationIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationExecutionLog" ADD CONSTRAINT "IntegrationExecutionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
