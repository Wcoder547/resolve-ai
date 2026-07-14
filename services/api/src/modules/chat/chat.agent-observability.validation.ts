import { AgentRunStatus } from "@prisma/client";
import { z } from "zod";

export const listAgentRunsQuerySchema = z.object({
  status: z.enum(AgentRunStatus).optional(),
  conversationId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional()
});

export const agentRunParamsSchema = z.object({
  agentRunId: z.uuid()
});

export type ListAgentRunsQuery = z.infer<typeof listAgentRunsQuerySchema>;