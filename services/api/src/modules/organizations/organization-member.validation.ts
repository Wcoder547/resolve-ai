import { z } from "zod";

export const updateOrganizationMemberSchema = z.object({
  role: z.enum(["ADMIN", "SUPPORT_AGENT", "DEVELOPER", "VIEWER"]),
});

export type UpdateOrganizationMemberInput = z.infer<
  typeof updateOrganizationMemberSchema
>;
