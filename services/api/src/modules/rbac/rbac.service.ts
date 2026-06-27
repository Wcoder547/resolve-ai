import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { roleHasPermission, type Permission } from "./rbac.permissions.js";

export function createForbiddenError(message = "You do not have permission to perform this action.") {
  const error = new Error(message);
  error.name = "ForbiddenError";
  return error;
}

export function createNotFoundError(message = "Organization membership not found.") {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}

export async function getPrimaryMembershipWithRole(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    include: {
      organization: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw createNotFoundError("No organization found for this user.");
  }

  return membership;
}

export async function assertUserPermission(input: {
  userId: string;
  permission: Permission;
}) {
  const membership = await getPrimaryMembershipWithRole(input.userId);

  if (!roleHasPermission(membership.role, input.permission)) {
    throw createForbiddenError();
  }

  return membership;
}

export async function assertUserRole(input: {
  userId: string;
  allowedRoles: UserRole[];
}) {
  const membership = await getPrimaryMembershipWithRole(input.userId);

  if (!input.allowedRoles.includes(membership.role)) {
    throw createForbiddenError();
  }

  return membership;
}