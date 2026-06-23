import { z } from "zod";

export const searchKnowledgeSchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters."),
  limit: z.number().int().min(1).max(20).optional()
});

export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;