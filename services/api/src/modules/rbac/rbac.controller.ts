import type { Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import { ROLE_PERMISSIONS } from "./rbac.permissions.js";
import { getPrimaryMembershipWithRole } from "./rbac.service.js";

export async function getMyPermissionsController(
  req: AuthenticatedRequest,
  res: Response
) {
  const membership = await getPrimaryMembershipWithRole(req.user.id);

  return res.json({
    success: true,
    message: "Permissions fetched successfully.",
    data: {
      organizationId: membership.organizationId,
      role: membership.role,
      permissions: ROLE_PERMISSIONS[membership.role]
    }
  });
}