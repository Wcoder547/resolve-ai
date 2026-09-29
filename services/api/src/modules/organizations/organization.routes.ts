import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireVerifiedEmail } from "../../middleware/email-verified.middleware.js";
import { requirePermission, requireRole } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  deleteOrganizationController,
  getCurrentOrganizationController,
  getOrganizationMembersController,
  listOrganizationAuditLogsController,
  removeOrganizationMemberController,
  transferOrganizationController,
  updateOrganizationController,
  updateOrganizationMemberController,
  updateOrganizationPlanController
} from "./organization.controller.js";
import {
  deleteOrganizationAiProviderController,
  listOrganizationAiProvidersController,
  setDefaultOrganizationAiProviderController,
  testOrganizationAiProviderController,
  upsertOrganizationAiProviderController
} from "./organization-ai-provider.controller.js";
import {
  listNotificationPreferencesController,
  updateNotificationPreferencesController
} from "./organization-notification.controller.js";
import {
  acceptOrganizationInviteController,
  createOrganizationInviteController,
  listOrganizationInvitesController,
  previewOrganizationInviteController,
  resendOrganizationInviteController,
  revokeOrganizationInviteController
} from "./organization-invite.controller.js";

const router = Router();

router.get("/invites/preview", previewOrganizationInviteController);
router.post("/invites/accept", acceptOrganizationInviteController);

router.use(requireAuth);

router.get("/current", requirePermission(PERMISSIONS.ORGANIZATION_READ), getCurrentOrganizationController);
router.patch(
  "/current",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_UPDATE),
  updateOrganizationController
);
router.post(
  "/current/transfer",
  requireVerifiedEmail,
  requireRole([UserRole.OWNER]),
  transferOrganizationController
);
router.delete(
  "/current",
  requireVerifiedEmail,
  requireRole([UserRole.OWNER]),
  deleteOrganizationController
);
router.patch(
  "/current/plan",
  requireVerifiedEmail,
  requireRole([UserRole.OWNER]),
  updateOrganizationPlanController
);
router.get("/members", requirePermission(PERMISSIONS.ORGANIZATION_READ), getOrganizationMembersController);
router.patch(
  "/members/:memberId",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  updateOrganizationMemberController
);
router.delete(
  "/members/:memberId",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  removeOrganizationMemberController
);

router.get(
  "/invites",
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  listOrganizationInvitesController
);
router.post(
  "/invites",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  createOrganizationInviteController
);
router.post(
  "/invites/:inviteId/resend",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  resendOrganizationInviteController
);
router.delete(
  "/invites/:inviteId",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_MANAGE),
  revokeOrganizationInviteController
);

router.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_LOG_READ),
  listOrganizationAuditLogsController
);

router.get(
  "/ai-providers",
  requirePermission(PERMISSIONS.INTEGRATION_READ),
  listOrganizationAiProvidersController
);
router.put(
  "/ai-providers/:provider",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  upsertOrganizationAiProviderController
);
router.post(
  "/ai-providers/:provider/default",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  setDefaultOrganizationAiProviderController
);
router.post(
  "/ai-providers/:provider/test",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  testOrganizationAiProviderController
);
router.delete(
  "/ai-providers/:provider",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE),
  deleteOrganizationAiProviderController
);

router.get(
  "/notification-preferences",
  requirePermission(PERMISSIONS.ORGANIZATION_READ),
  listNotificationPreferencesController
);
router.put(
  "/notification-preferences",
  requireVerifiedEmail,
  requirePermission(PERMISSIONS.ORGANIZATION_READ),
  updateNotificationPreferencesController
);

export default router;
