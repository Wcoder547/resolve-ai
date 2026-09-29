import { z } from "zod";

export const verifyEmailQuerySchema = z.object({
  token: z
    .string({ error: "Verification token is required." })
    .trim()
    .min(20, "Invalid verification token."),
});

export const verifyEmailBodySchema = z.object({
  token: z
    .string({ error: "Verification token is required." })
    .trim()
    .min(20, "Invalid verification token."),
});

export const resendVerificationBodySchema = z.object({
  email: z.email("Please enter a valid email address.").toLowerCase().optional(),
});

export type ResendVerificationInput = z.infer<
  typeof resendVerificationBodySchema
>;
