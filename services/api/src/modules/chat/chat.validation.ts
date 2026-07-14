import { z } from "zod";

export const askQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, "Question must be at least 2 characters.")
    .max(4000, "Question must be less than 4000 characters."),
  conversationId: z.uuid().optional(),
  limit: z.number().int().min(1).max(10).optional()
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;