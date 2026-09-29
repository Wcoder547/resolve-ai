import { z } from "zod";
import { passwordSchema } from "../auth/auth.validation.js";

export const createOrganizationInviteSchema = z.object({
  email: z.email("Valid email is required.").toLowerCase(),
  role: z
    .enum(["ADMIN", "SUPPORT_AGENT", "DEVELOPER", "VIEWER"])
    .default("VIEWER"),
});

export const previewInviteQuerySchema = z.object({
  token: z
    .string({ error: "Invitation token is required." })
    .trim()
    .min(20, "Invalid invitation token."),
});

export const acceptInviteBodySchema = z.object({
  token: z
    .string({ error: "Invitation token is required." })
    .trim()
    .min(20, "Invalid invitation token."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be less than 80 characters.")
    .optional(),
  password: passwordSchema.optional(),
});

export type CreateOrganizationInviteInput = z.infer<
  typeof createOrganizationInviteSchema
>;
export type AcceptInviteInput = z.infer<typeof acceptInviteBodySchema>;
