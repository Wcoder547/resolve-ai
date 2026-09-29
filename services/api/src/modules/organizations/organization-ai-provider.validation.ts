import { z } from "zod";

export const aiLlmProviderSchema = z.enum(["OPENROUTER", "GROQ", "GEMINI"]);

export const aiProviderParamsSchema = z.object({
  provider: aiLlmProviderSchema,
});

export const upsertAiProviderSchema = z
  .object({
    apiKey: z.string().trim().min(16, "API key is too short.").max(512).optional(),
    model: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Boolean(data.apiKey || data.model), {
    message: "Provide an API key or model to update.",
  });

export type AiLlmProviderName = z.infer<typeof aiLlmProviderSchema>;
export type UpsertAiProviderInput = z.infer<typeof upsertAiProviderSchema>;
