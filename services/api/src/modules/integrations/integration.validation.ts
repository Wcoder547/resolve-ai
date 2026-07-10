import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { z } from "zod";

export const createIntegrationSchema = z.object({
  provider: z.nativeEnum(IntegrationProvider),
  name: z.string().trim().min(2).max(100),
  status: z.nativeEnum(IntegrationStatus).optional().default("ACTIVE"),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  credentials: z.record(z.string(), z.unknown()).default({})
});

export const updateIntegrationStatusSchema = z.object({
  status: z.nativeEnum(IntegrationStatus)
});

export const testIntegrationSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional().default({})
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;