
import { signAccessToken, verifyRefreshToken } from "../../utils/jwt.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import type {
  ChangePasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput
} from "./auth.validation.js";
import {
  createStoredRefreshToken,
  createUniqueOrganizationSlug,
  hashRefreshToken
} from "./auth.utils.js";
import { sendEmailVerificationForUser } from "./email-verification.service.js";
import { createAuthError } from "./auth-error.js";

function createSafeUnauthorizedError() {
  return createAuthError(
    "UnauthorizedError",
    "Invalid email or password.",
    "INVALID_CREDENTIALS",
  );
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
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

async function writeAuditLog(input: {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      organizationId: input.organizationId || null,
      action: input.action,
      metadata: (input.metadata || {}) as Prisma.InputJsonValue
    }
  });
}

export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email
    }
  });

  if (existingUser) {
    throw createAuthError(
      "ConflictError",
      "An account with this email already exists.",
      "USER_EXISTS",
    );
  }

  const passwordHash = await hashPassword(data.password);
  const organizationSlug = await createUniqueOrganizationSlug(
    data.organizationName
  );

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash
      }
    });

    const organization = await tx.organization.create({
      data: {
        name: data.organizationName,
        slug: organizationSlug
      }
    });

    await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "OWNER"
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        action: "AUTH_REGISTER",
        metadata: {
          email: user.email,
          organizationName: organization.name
        }
      }
    });

    return {
      user,
      organization
    };
  });

  await sendEmailVerificationForUser(result.user.id).catch((error) => {
    logger.warn(
      {
        userId: result.user.id,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to send verification email after registration"
    );
  });

  const accessToken = signAccessToken({
    userId: result.user.id,
    email: result.user.email
  });

  const refreshToken = await createStoredRefreshToken(result.user.id);

  return {
    user: toAuthUser(result.user),
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email
    },
    include: {
      memberships: {
        include: {
          organization: true
        },
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      }
    }
  });

  if (!user) {
    throw createSafeUnauthorizedError();
  }

  const isPasswordValid = await comparePassword(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw createSafeUnauthorizedError();
  }

  if (!user.emailVerifiedAt) {
    throw createAuthError(
      "ForbiddenError",
      "Please verify your email before logging in.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  const organization = user.memberships[0]?.organization || null;
  const membership = user.memberships[0] || null;

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email
  });

  const refreshToken = await createStoredRefreshToken(user.id);

  await writeAuditLog({
    userId: user.id,
    organizationId: organization?.id,
    action: "AUTH_LOGIN",
    metadata: {
      email: user.email
    }
  });

  return {
    user: toAuthUser(user),
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role: membership?.role
        }
      : null,
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function refreshUserToken(data: RefreshInput) {
  let payload: {
    userId: string;
    type: "refresh";
  };

  try {
    payload = verifyRefreshToken(data.refreshToken);
  } catch {
    throw createAuthError(
      "UnauthorizedError",
      "Invalid or expired refresh token.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  if (payload.type !== "refresh") {
    throw createAuthError(
      "UnauthorizedError",
      "Invalid or expired refresh token.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user) {
    throw createAuthError(
      "UnauthorizedError",
      "User no longer exists.",
      "USER_NOT_FOUND",
    );
  }

  if (!user.emailVerifiedAt) {
    throw createAuthError(
      "ForbiddenError",
      "Please verify your email before continuing.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  const incomingTokenHash = hashRefreshToken(data.refreshToken);

  const activeRefreshTokens = await prisma.refreshToken.findMany({
    where: {
      userId: user.id,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  const matchingToken = activeRefreshTokens.find(
    (token) => token.tokenHash === incomingTokenHash
  );

  if (!matchingToken) {
    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "AUTH_REFRESH_REUSE_DETECTED",
      metadata: {
        reason: "Refresh token was valid JWT but not active in database."
      }
    });

    throw createAuthError(
      "UnauthorizedError",
      "Invalid or expired refresh token.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  await prisma.refreshToken.update({
    where: {
      id: matchingToken.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email
  });

  const refreshToken = await createStoredRefreshToken(user.id);

  await writeAuditLog({
    userId: user.id,
    action: "AUTH_REFRESH_ROTATED",
    metadata: {
      oldRefreshTokenId: matchingToken.id
    }
  });

  return {
    user: toAuthUser(user),
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      memberships: {
        include: {
          organization: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!user) {
    throw createAuthError("NotFoundError", "User not found.");
  }

  return {
    user: toAuthUser(user),
    organizations: user.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role
    }))
  };
}

export async function logoutUser(userId: string, input: LogoutInput) {
  if (input.refreshToken) {
    const tokenHash = hashRefreshToken(input.refreshToken);

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await writeAuditLog({
      userId,
      action: "AUTH_LOGOUT_CURRENT_SESSION",
      metadata: {
        mode: "single_session"
      }
    });

    return true;
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await writeAuditLog({
    userId,
    action: "AUTH_LOGOUT_ALL_SESSIONS_BY_FALLBACK",
    metadata: {
      mode: "fallback_all_sessions",
      reason: "No refresh token provided."
    }
  });

  return true;
}

export async function logoutAllUserSessions(userId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await writeAuditLog({
    userId,
    action: "AUTH_LOGOUT_ALL_SESSIONS",
    metadata: {
      mode: "all_sessions"
    }
  });

  return true;
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw createAuthError("NotFoundError", "User not found.");
  }

  const isCurrentValid = await comparePassword(
    input.currentPassword,
    user.passwordHash
  );

  if (!isCurrentValid) {
    throw createAuthError("UnauthorizedError", "Current password is incorrect.");
  }

  const isSamePassword = await comparePassword(
    input.newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    throw createAuthError(
      "BadRequestError",
      "New password must be different from the current password."
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      passwordHash
    }
  });

  await prisma.refreshToken.updateMany({
    where: {
      userId: user.id,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email
  });

  const refreshToken = await createStoredRefreshToken(user.id);

  await writeAuditLog({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    metadata: {
      email: user.email
    }
  });

  return {
    user: toAuthUser(user),
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function listUserSessions(userId: string, currentRefreshToken?: string) {
  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true
    }
  });

  const currentHash = currentRefreshToken
    ? hashRefreshToken(currentRefreshToken)
    : null;

  const currentSession = currentHash
    ? await prisma.refreshToken.findFirst({
        where: {
          userId,
          tokenHash: currentHash,
          revokedAt: null
        },
        select: {
          id: true
        }
      })
    : null;

  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: currentSession?.id === session.id
    }))
  };
}

export async function revokeUserSession(userId: string, sessionId: string) {
  const session = await prisma.refreshToken.findFirst({
    where: {
      id: sessionId,
      userId
    }
  });

  if (!session) {
    throw createAuthError("NotFoundError", "Session not found.");
  }

  if (!session.revokedAt) {
    await prisma.refreshToken.update({
      where: {
        id: session.id
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  await writeAuditLog({
    userId,
    action: "AUTH_SESSION_REVOKED",
    metadata: {
      sessionId: session.id
    }
  });

  return true;
}

export async function revokeOtherUserSessions(
  userId: string,
  currentRefreshToken: string
) {
  const currentHash = hashRefreshToken(currentRefreshToken);

  const currentSession = await prisma.refreshToken.findFirst({
    where: {
      userId,
      tokenHash: currentHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!currentSession) {
    throw createAuthError(
      "UnauthorizedError",
      "Invalid or expired refresh token."
    );
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: {
        not: currentSession.id
      }
    },
    data: {
      revokedAt: new Date()
    }
  });

  await writeAuditLog({
    userId,
    action: "AUTH_OTHER_SESSIONS_REVOKED",
    metadata: {
      keptSessionId: currentSession.id
    }
  });

  return true;
}
