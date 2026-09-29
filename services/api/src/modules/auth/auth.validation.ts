import { z } from "zod";

export const passwordSchema = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be less than 128 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be less than 80 characters."),
  email: z.email("Please enter a valid email address.").toLowerCase(),
  password: passwordSchema,
  organizationName: z
    .string({ error: "Organization name is required." })
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(100, "Organization name must be less than 100 characters."),
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address.").toLowerCase(),
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required."),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ error: "Refresh token is required." })
    .min(1, "Refresh token is required."),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Current password is required." })
    .min(1, "Current password is required."),
  newPassword: passwordSchema,
});

export const revokeSessionSchema = z.object({
  refreshToken: z
    .string({ error: "Refresh token is required." })
    .min(1, "Refresh token is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;