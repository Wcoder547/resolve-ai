import { z } from "zod";
import { passwordSchema } from "./auth.validation.js";

export const forgotPasswordBodySchema = z.object({
  email: z.email("Please enter a valid email address.").toLowerCase(),
});

export const resetPasswordBodySchema = z.object({
  token: z
    .string({ error: "Reset token is required." })
    .trim()
    .min(20, "Invalid or expired reset token."),
  password: passwordSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;
