import { Prisma, UserRole } from "@prisma/client";
import { env, isProduction } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { createSecureToken, hashSecureToken } from "../../lib/secure-token.js";
import { signAccessToken } from "../../utils/jwt.js";
import { hashPassword } from "../../utils/password.js";
import { createStoredRefreshToken } from "../auth/auth.utils.js";
import { sendOrganizationInviteEmail } from "../email/email.service.js";
import type {
  AcceptInviteInput,
  CreateOrganizationInviteInput,
} from "./organization-invite.validation.js";

function createError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function assertInviterCanAssignRole(inviterRole: UserRole, inviteRole: UserRole) {
  if (inviteRole === UserRole.OWNER) {
    throw createError("ForbiddenError", "You cannot invite someone as an owner.");
  }

  if (inviterRole === UserRole.OWNER) {
    return;
  }

  if (inviterRole === UserRole.ADMIN && inviteRole !== UserRole.ADMIN) {
    return;
  }

  throw createError(
    "ForbiddenError",
    "You do not have permission to assign that role.",
  );
}

async function findUsableInviteByToken(token: string) {
  const tokenHash = hashSecureToken(token.trim());

  const invite = await prisma.organizationInvite.findUnique({
    where: {
      tokenHash,
    },
    include: {
      organization: true,
    },
  });

  if (!invite || invite.revokedAt) {
    throw createError("BadRequestError", "Invalid or expired invitation.");
  }

  if (invite.acceptedAt) {
    throw createError("ConflictError", "This invitation has already been accepted.");
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    throw createError("BadRequestError", "This invitation has expired.");
  }

  return invite;
}

function serializeInvite(
  invite: {
    id: string;
    email: string;
    role: UserRole;
    expiresAt: Date;
    createdAt: Date;
    invitedBy: { id: string; name: string; email: string } | null;
  },
) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    invitedBy: invite.invitedBy,
  };
}

export async function createOrganizationInvite(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  input: CreateOrganizationInviteInput,
) {
  assertInviterCanAssignRole(actorRole, input.role);

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, name: true, email: true },
  });

  if (!actor) {
    throw createError("NotFoundError", "User not found.");
  }

  if (actor.email === input.email) {
    throw createError("BadRequestError", "You cannot invite yourself.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw createError("NotFoundError", "Organization not found.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: {
        where: { organizationId },
      },
    },
  });

  if (existingUser?.memberships.length) {
    throw createError(
      "ConflictError",
      "That user is already a member of this organization.",
    );
  }

  await prisma.organizationInvite.updateMany({
    where: {
      organizationId,
      email: input.email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  const token = createSecureToken(32);
  const tokenHash = hashSecureToken(token);
  const expiresAt = addHours(new Date(), env.ORGANIZATION_INVITE_TOKEN_TTL_HOURS);

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId,
      email: input.email,
      role: input.role,
      tokenHash,
      invitedByUserId: actorUserId,
      expiresAt,
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const inviteUrl = `${env.FRONTEND_URL}/auth/accept-invite?token=${encodeURIComponent(
    token,
  )}`;

  const emailResult = await sendOrganizationInviteEmail({
    email: input.email,
    organizationName: organization.name,
    inviterName: actor.name,
    role: input.role,
    inviteUrl,
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "ORGANIZATION_INVITE_SENT",
      metadata: {
        email: input.email,
        role: input.role,
        inviteId: invite.id,
      } as Prisma.InputJsonValue,
    },
  });

  logger.info(
    {
      organizationId,
      email: input.email,
      inviteId: invite.id,
      inviteUrl:
        !isProduction && emailResult.sent === false
          ? inviteUrl
          : "[sent-by-email]",
    },
    "Organization invite created",
  );

  return {
    invite: serializeInvite(invite),
    inviteUrl:
      !isProduction && emailResult.sent === false ? inviteUrl : null,
  };
}

export async function listOrganizationInvites(organizationId: string) {
  const invites = await prisma.organizationInvite.findMany({
    where: {
      organizationId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invites.map(serializeInvite);
}

export async function resendOrganizationInvite(
  actorUserId: string,
  organizationId: string,
  actorRole: UserRole,
  inviteId: string,
) {
  const existing = await prisma.organizationInvite.findFirst({
    where: {
      id: inviteId,
      organizationId,
    },
  });

  if (!existing || existing.revokedAt || existing.acceptedAt) {
    throw createError("NotFoundError", "Invitation not found.");
  }

  return createOrganizationInvite(actorUserId, organizationId, actorRole, {
    email: existing.email,
    role: existing.role === UserRole.OWNER ? UserRole.VIEWER : existing.role,
  });
}

export async function revokeOrganizationInvite(
  actorUserId: string,
  organizationId: string,
  inviteId: string,
) {
  const invite = await prisma.organizationInvite.findFirst({
    where: {
      id: inviteId,
      organizationId,
    },
  });

  if (!invite) {
    throw createError("NotFoundError", "Invitation not found.");
  }

  if (!invite.revokedAt && !invite.acceptedAt) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      organizationId,
      action: "ORGANIZATION_INVITE_REVOKED",
      metadata: {
        email: invite.email,
        inviteId: invite.id,
      } as Prisma.InputJsonValue,
    },
  });

  return true;
}

export async function previewOrganizationInvite(token: string) {
  const invite = await findUsableInviteByToken(token);
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });

  return {
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    expiresAt: invite.expiresAt,
    accountExists: Boolean(existingUser),
  };
}

export async function acceptOrganizationInvite(input: AcceptInviteInput) {
  const invite = await findUsableInviteByToken(input.token);
  let user = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (!user) {
    if (!input.name || !input.password) {
      throw createError(
        "BadRequestError",
        "Name and password are required to create an account.",
      );
    }

    const passwordHash = await hashPassword(input.password);
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: invite.email,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  }

  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: invite.organizationId,
      },
    },
  });

  if (existingMembership) {
    throw createError(
      "ConflictError",
      "You are already a member of this organization.",
    );
  }

  const membership = await prisma.$transaction(async (tx) => {
    const createdMembership = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await tx.organizationInvite.updateMany({
      where: {
        organizationId: invite.organizationId,
        email: invite.email,
        acceptedAt: null,
        revokedAt: null,
        id: { not: invite.id },
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        action: "ORGANIZATION_INVITE_ACCEPTED",
        metadata: {
          email: invite.email,
          role: invite.role,
          inviteId: invite.id,
        } as Prisma.InputJsonValue,
      },
    });

    return createdMembership;
  });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
  });
  const refreshToken = await createStoredRefreshToken(user.id);

  return {
    user: toAuthUser(user),
    organization: {
      id: invite.organization.id,
      name: invite.organization.name,
      slug: invite.organization.slug,
      role: membership.role,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}
