import { z } from "zod";

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2, "Organization name is required.").max(80).optional(),
    slug: z.string().trim().min(2, "Workspace URL is required.").max(80).optional(),
  })
  .refine((data) => Boolean(data.name || data.slug), {
    message: "Provide a name or workspace URL to update.",
  });

export const transferOrganizationSchema = z.object({
  memberId: z.uuid(),
});

export const deleteOrganizationSchema = z.object({
  confirmName: z.string().trim().min(1, "Type the organization name to confirm."),
});

/** Free product — only FREE is accepted for plan updates. */
export const updateOrganizationPlanSchema = z.object({
  plan: z.enum(["FREE"]),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type TransferOrganizationInput = z.infer<typeof transferOrganizationSchema>;
export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
export type UpdateOrganizationPlanInput = z.infer<typeof updateOrganizationPlanSchema>;
