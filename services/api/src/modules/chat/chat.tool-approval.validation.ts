import { z } from "zod";

export const rejectToolCallSchema = z.object({
  reason: z.string().trim().max(1000).optional()
});

export type RejectToolCallInput = z.infer<typeof rejectToolCallSchema>;