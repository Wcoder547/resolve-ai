import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be less than 128 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Valid email is required.").toLowerCase(),
  password: passwordSchema,
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required.")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required.").toLowerCase(),
  password: z.string().min(1, "Password is required.")
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required.")
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;