import { z } from "zod";

export const askQuestionSchema = z.object({
  question: z.string().min(2, "Question must be at least 2 characters."),
  conversationId: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional()
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;