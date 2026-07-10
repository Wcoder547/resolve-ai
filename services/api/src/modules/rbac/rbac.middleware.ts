import type { Request, RequestHandler } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AuthenticatedUser } from "../../types/express.js";
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

function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    const error = new Error("Unauthorized.");
    error.name = "UnauthorizedError";
    throw error;
  }

  return req.user;
}

export function requirePermission(permission: Permission): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const membership = await getPrimaryMembershipWithRole(user.id);

      if (!roleHasPermission(membership.role, permission)) {
        await writeForbiddenAuditLog({
          userId: user.id,
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

export function requireRole(allowedRoles: UserRole[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const membership = await getPrimaryMembershipWithRole(user.id);

      if (!allowedRoles.includes(membership.role)) {
        await writeForbiddenAuditLog({
          userId: user.id,
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
