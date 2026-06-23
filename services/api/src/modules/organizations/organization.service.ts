import { prisma } from "../../lib/prisma.js";

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

  return {
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    plan: membership.organization.plan,
    role: membership.role,
    createdAt: membership.organization.createdAt
  };
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

  return members.map((member) => ({
    id: member.id,
    role: member.role,
    joinedAt: member.createdAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email
    }
  }));
}