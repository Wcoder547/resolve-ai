import { prisma } from "../../lib/prisma.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import {
  signAccessToken,
  verifyRefreshToken
} from "../../utils/jwt.js";
import {
  createStoredRefreshToken,
  createUniqueOrganizationSlug
} from "./auth.utils.js";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput
} from "./auth.validation.js";

export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email
    }
  });

  if (existingUser) {
    const error = new Error("User with this email already exists.");
    error.name = "ConflictError";
    throw error;
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

  const accessToken = signAccessToken({
    userId: result.user.id,
    email: result.user.email
  });

  const refreshToken = await createStoredRefreshToken(result.user.id);

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email
    },
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
        }
      }
    }
  });

  if (!user) {
    const error = new Error("Invalid email or password.");
    error.name = "UnauthorizedError";
    throw error;
  }

  const isPasswordValid = await comparePassword(
    data.password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password.");
    error.name = "UnauthorizedError";
    throw error;
  }

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email
  });

  const refreshToken = await createStoredRefreshToken(user.id);

  const activeMembership = user.memberships[0];

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: activeMembership?.organizationId,
      action: "AUTH_LOGIN",
      metadata: {
        email: user.email
      }
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    organization: activeMembership
      ? {
          id: activeMembership.organization.id,
          name: activeMembership.organization.name,
          slug: activeMembership.organization.slug,
          role: activeMembership.role
        }
      : null,
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function refreshUserToken(data: RefreshInput) {
  const payload = verifyRefreshToken(data.refreshToken);

  if (payload.type !== "refresh") {
    const error = new Error("Invalid refresh token.");
    error.name = "UnauthorizedError";
    throw error;
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  let matchedTokenId: string | null = null;

  for (const storedToken of storedTokens) {
    const isMatch = await comparePassword(
      data.refreshToken,
      storedToken.tokenHash
    );

    if (isMatch) {
      matchedTokenId = storedToken.id;
      break;
    }
  }

  if (!matchedTokenId) {
    const error = new Error("Invalid or expired refresh token.");
    error.name = "UnauthorizedError";
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user) {
    const error = new Error("User no longer exists.");
    error.name = "UnauthorizedError";
    throw error;
  }

  await prisma.refreshToken.update({
    where: {
      id: matchedTokenId
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

  return {
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
        }
      }
    }
  });

  if (!user) {
    const error = new Error("User not found.");
    error.name = "NotFoundError";
    throw error;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    organizations: user.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role
    }))
  };
}

export async function logoutUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  return true;
}