import type { NextFunction, Response } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AuthenticatedRequest } from "../../types/express.js";
import { type Permission, roleHasPermission } from "./rbac.permissions.js";
import { getPrimaryMembershipWithRole } from "./rbac.service.js";

async function writeForbiddenAuditLog(input: {
  userId: string;
  organizationId?: string | null;
  permission?: Permission;
  allowedRoles?: UserRole[];
  path: string;
  method: string;
}) {
  await prisma.auditLog
    .create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId || null,
        action: "RBAC_FORBIDDEN_ACCESS",
        metadata: {
          permission: input.permission,
          allowedRoles: input.allowedRoles,
          path: input.path,
          method: input.method
        } as Prisma.InputJsonValue
      }
    })
    .catch(() => null);
}

export function requirePermission(permission: Permission) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const membership = await getPrimaryMembershipWithRole(req.user.id);

      if (!roleHasPermission(membership.role, permission)) {
        await writeForbiddenAuditLog({
          userId: req.user.id,
          organizationId: membership.organizationId,
          permission,
          path: req.originalUrl,
          method: req.method
        });

        const error = new Error("You do not have permission to perform this action.");
        error.name = "ForbiddenError";
        throw error;
      }

      req.organization = {
        id: membership.organizationId,
        role: membership.role
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const membership = await getPrimaryMembershipWithRole(req.user.id);

      if (!allowedRoles.includes(membership.role)) {
        await writeForbiddenAuditLog({
          userId: req.user.id,
          organizationId: membership.organizationId,
          allowedRoles,
          path: req.originalUrl,
          method: req.method
        });

        const error = new Error("You do not have permission to perform this action.");
        error.name = "ForbiddenError";
        throw error;
      }

      req.organization = {
        id: membership.organizationId,
        role: membership.role
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}