export type KnowledgeIngestionTrigger = "UPLOAD" | "MANUAL_RETRY" | "ADMIN";

export type KnowledgeIngestionJobData = {
  sourceId: string;
  userId: string;
  organizationId: string;
  trigger: KnowledgeIngestionTrigger;
  requestedAt: string;
};