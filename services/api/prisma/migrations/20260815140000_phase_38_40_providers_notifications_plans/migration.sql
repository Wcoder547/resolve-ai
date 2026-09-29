-- CreateEnum
CREATE TYPE "AiLlmProvider" AS ENUM ('OPENROUTER', 'GROQ', 'GEMINI');

-- CreateTable
CREATE TABLE "OrganizationAiProvider" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "AiLlmProvider" NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "keyLastFour" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAiProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationAiProvider_organizationId_provider_key" ON "OrganizationAiProvider"("organizationId", "provider");
CREATE INDEX "OrganizationAiProvider_organizationId_idx" ON "OrganizationAiProvider"("organizationId");
CREATE INDEX "OrganizationAiProvider_organizationId_isDefault_idx" ON "OrganizationAiProvider"("organizationId", "isDefault");

ALTER TABLE "OrganizationAiProvider" ADD CONSTRAINT "OrganizationAiProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationPreference_userId_organizationId_eventKey_key" ON "UserNotificationPreference"("userId", "organizationId", "eventKey");
CREATE INDEX "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");
CREATE INDEX "UserNotificationPreference_organizationId_idx" ON "UserNotificationPreference"("organizationId");

ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
