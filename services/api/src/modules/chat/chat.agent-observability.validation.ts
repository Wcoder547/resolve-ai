import { AgentRunStatus } from "@prisma/client";
import { z } from "zod";

export const listAgentRunsQuerySchema = z.object({
  status: z.nativeEnum(AgentRunStatus).optional(),
  conversationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const agentRunParamsSchema = z.object({
  agentRunId: z.string().uuid()
});

export type ListAgentRunsQuery = z.infer<typeof listAgentRunsQuerySchema>;