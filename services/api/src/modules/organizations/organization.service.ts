import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createSlug } from "../auth/auth.utils.js";
import type { UpdateOrganizationMemberInput } from "./organization-member.validation.js";
import type {
  DeleteOrganizationInput,
  TransferOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationPlanInput,
} from "./organization.validation.js";

function createError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function serializeOrganization(
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: Date;
  },
  role: UserRole,
) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    plan: organization.plan,
    role,
    createdAt: organization.createdAt,
  };
}

function serializeMember(member: {
  id: string;
  role: UserRole;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}) {
  return {
    id: member.id,
    role: member.role,
    joinedAt: member.createdAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
    },
  };
}

function assertCanAssignRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === UserRole.OWNER) {
    throw createError("ForbiddenError", "You cannot assign the owner role.");
  }

  if (actorRole === UserRole.OWNER) {
    return;
  }

  if (actorRole === UserRole.ADMIN && targetRole !== UserRole.ADMIN) {
    return;
  }

  throw createError(
    "ForbiddenError",
    "You do not have permission to assign that role.",
  );
}

function assertCanManageMember(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === UserRole.OWNER) {
    throw createError("ForbiddenError", "The organization owner cannot be modified this way.");
  }

  if (actorRole === UserRole.OWNER) {
    return;
  }

  if (actorRole === UserRole.ADMIN && targetRole !== UserRole.ADMIN) {
    return;
  }

  throw createError(
    "ForbiddenError",
    "You do not have permission to manage that member.",
  );
}

export async function getCurrentOrganization(userId: string) {
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
    const error = new Error("No organization found for this user.");
    error.name = "NotFoundError";
    throw error;
  }

  return serializeOrganization(membership.organization, membership.role);
}

export async function updateOrganization(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  input: UpdateOrganizationInput,
) {
  if (actorRole !== UserRole.OWNER && actorRole !== UserRole.ADMIN) {
    throw createError("ForbiddenError", "You do not have permission to update this organization.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw createError("NotFoundError", "Organization not found.");
  }

  const data: { name?: string; slug?: string } = {};

  if (input.name && input.name !== organization.name) {
    data.name = input.name;
  }

  if (input.slug) {
    const slug = createSlug(input.slug);
    if (!slug || slug.length < 2) {
      throw createError("BadRequestError", "Workspace URL must contain at least two letters or numbers.");
    }

    if (slug !== organization.slug) {
      const taken = await prisma.organization.findUnique({
        where: { slug },
      });
      if (taken) {
        throw createError("ConflictError", "That workspace URL is already taken.");
      }
      data.slug = slug;
    }
  }

  if (!data.name && !data.slug) {
    return serializeOrganization(organization, actorRole);
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        organizationId,
        action: "ORGANIZATION_UPDATED",
        metadata: {
          fromName: organization.name,
          toName: updated.name,
          fromSlug: organization.slug,
          toSlug: updated.slug,
        } as Prisma.InputJsonValue,
      },
    });

    return serializeOrganization(updated, actorRole);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw createError("ConflictError", "That workspace URL is already taken.");
    }
    throw error;
  }
}

export async function transferOrganizationOwnership(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  input: TransferOrganizationInput,
) {
  if (actorRole !== UserRole.OWNER) {
    throw createError("ForbiddenError", "Only the owner can transfer this workspace.");
  }

  const target = await prisma.organizationMember.findFirst({
    where: {
      id: input.memberId,
      organizationId,
    },
    include: {
      user: true,
      organization: true,
    },
  });

  if (!target) {
    throw createError("NotFoundError", "Member not found.");
  }

  if (target.userId === actorUserId) {
    throw createError("BadRequestError", "You already own this workspace.");
  }

  if (target.role === UserRole.OWNER) {
    throw createError("BadRequestError", "That member is already an owner.");
  }

  const actorMembership = await prisma.organizationMember.findFirst({
    where: {
      userId: actorUserId,
      organizationId,
    },
  });

  if (!actorMembership) {
    throw createError("NotFoundError", "Organization membership not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.update({
      where: { id: actorMembership.id },
      data: { role: UserRole.ADMIN },
    });

    await tx.organizationMember.update({
      where: { id: target.id },
      data: { role: UserRole.OWNER },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        organizationId,
        action: "ORGANIZATION_OWNERSHIP_TRANSFERRED",
        metadata: {
          fromMemberId: actorMembership.id,
          toMemberId: target.id,
          toUserId: target.userId,
          email: target.user.email,
          previousRole: target.role,
        } as Prisma.InputJsonValue,
      },
    });
  });

  return serializeOrganization(target.organization, UserRole.ADMIN);
}

export async function deleteOrganization(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  input: DeleteOrganizationInput,
) {
  if (actorRole !== UserRole.OWNER) {
    throw createError("ForbiddenError", "Only the owner can delete this workspace.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw createError("NotFoundError", "Organization not found.");
  }

  if (input.confirmName !== organization.name) {
    throw createError(
      "BadRequestError",
      "Type the exact organization name to confirm deletion.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        organizationId,
        action: "ORGANIZATION_DELETED",
        metadata: {
          name: organization.name,
          slug: organization.slug,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.aiUsageEvent.deleteMany({
      where: { organizationId },
    });

    await tx.organizationAiUsageDaily.deleteMany({
      where: { organizationId },
    });

    await tx.organization.delete({
      where: { id: organizationId },
    });
  });

  return true;
}

export async function updateOrganizationPlan(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  input: UpdateOrganizationPlanInput,
) {
  if (actorRole !== UserRole.OWNER) {
    throw createError("ForbiddenError", "Only the owner can change the workspace plan.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw createError("NotFoundError", "Organization not found.");
  }

  if (organization.plan === input.plan) {
    return serializeOrganization(organization, actorRole);
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: input.plan },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "ORGANIZATION_PLAN_UPDATED",
      metadata: {
        fromPlan: organization.plan,
        toPlan: updated.plan,
      } as Prisma.InputJsonValue,
    },
  });

  return serializeOrganization(updated, actorRole);
}

export async function getOrganizationMembers(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    include: {
      organization: true
    }
  });

  if (!membership) {
    const error = new Error("No organization found for this user.");
    error.name = "NotFoundError";
    throw error;
  }

  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: membership.organizationId
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return members.map(serializeMember);
}

export async function updateOrganizationMemberRole(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  memberId: string,
  input: UpdateOrganizationMemberInput,
) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw createError("NotFoundError", "Member not found.");
  }

  if (member.userId === actorUserId) {
    throw createError("BadRequestError", "You cannot change your own role.");
  }

  assertCanManageMember(actorRole, member.role);
  assertCanAssignRole(actorRole, input.role);

  const updated = await prisma.organizationMember.update({
    where: {
      id: member.id,
    },
    data: {
      role: input.role,
    },
    include: {
      user: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "ORGANIZATION_MEMBER_ROLE_UPDATED",
      metadata: {
        memberId: member.id,
        targetUserId: member.userId,
        email: member.user.email,
        fromRole: member.role,
        toRole: input.role,
      } as Prisma.InputJsonValue,
    },
  });

  return serializeMember(updated);
}

export async function removeOrganizationMember(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  memberId: string,
) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw createError("NotFoundError", "Member not found.");
  }

  if (member.userId === actorUserId) {
    throw createError("BadRequestError", "You cannot remove yourself.");
  }

  assertCanManageMember(actorRole, member.role);

  await prisma.organizationMember.delete({
    where: {
      id: member.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "ORGANIZATION_MEMBER_REMOVED",
      metadata: {
        memberId: member.id,
        targetUserId: member.userId,
        email: member.user.email,
        role: member.role,
      } as Prisma.InputJsonValue,
    },
  });

  return true;
}