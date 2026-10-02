import { Prisma } from "@prisma/client";
import { env, isProduction } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { createSecureToken, hashSecureToken } from "../../lib/secure-token.js";
import { sendVerificationEmail } from "../email/email.service.js";

function createBadRequestError(message: string) {
  const error = new Error(message);
  error.name = "BadRequestError";
  return error;
}

function createNotFoundError(message: string) {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}

function createConflictError(message: string) {
  const error = new Error(message);
  error.name = "ConflictError";
  return error;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function getPrimaryOrganizationId(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return membership?.organizationId || null;
}

export async function createEmailVerificationToken(userId: string) {
  const token = createSecureToken(32);
  const tokenHash = hashSecureToken(token);

  const expiresAt = addMinutes(
    new Date(),
    env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  );

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function sendEmailVerificationForUser(userId: string) {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    logger.info(
      {
        userId,
      },
      "Email verification is disabled. Skipping verification email.",
    );

    return {
      sent: false,
      skipped: true,
      reason: "EMAIL_VERIFICATION_DISABLED",
      expiresAt: null as Date | null,
      devVerificationUrl: null as string | null,
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw createNotFoundError("User not found.");
  }

  if (user.emailVerifiedAt) {
    return {
      sent: false,
      alreadyVerified: true,
      expiresAt: null as Date | null,
      devVerificationUrl: null as string | null,
    };
  }

  const { token, expiresAt } = await createEmailVerificationToken(user.id);

  const verificationUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(
    token,
  )}`;

  const emailResult = await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationUrl,
  });

  logger.info(
    {
      userId: user.id,
      email: user.email,
      expiresAt,
      emailSent: emailResult.sent,
    },
    "Email verification token created",
  );

  return {
    sent: emailResult.sent,
    expiresAt,
    alreadyVerified: false,
    skipped: false,
    devVerificationUrl:
      !isProduction && emailResult.sent === false ? verificationUrl : null,
  };
}

export async function verifyEmailToken(token: string) {
  if (!token || token.trim().length < 20) {
    throw createBadRequestError("Invalid verification token.");
  }

  const tokenHash = hashSecureToken(token.trim());

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!verificationToken) {
    throw createBadRequestError("Invalid or expired verification token.");
  }

  if (verificationToken.usedAt) {
    throw createConflictError("This verification token has already been used.");
  }

  if (verificationToken.expiresAt.getTime() < Date.now()) {
    throw createBadRequestError("Verification token has expired.");
  }

  const organizationId = await getPrimaryOrganizationId(
    verificationToken.userId,
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: verificationToken.userId,
      },
      data: {
        emailVerifiedAt: verificationToken.user.emailVerifiedAt || new Date(),
      },
    });

    const usedToken = await tx.emailVerificationToken.update({
      where: {
        id: verificationToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.deleteMany({
      where: {
        userId: verificationToken.userId,
        usedAt: null,
        id: {
          not: verificationToken.id,
        },
      },
    });

    if (organizationId) {
      await tx.auditLog.create({
        data: {
          userId: verificationToken.userId,
          organizationId,
          action: "EMAIL_VERIFIED",
          metadata: {
            email: updatedUser.email,
            tokenId: usedToken.id,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return updatedUser;
  });

  return {
    verified: true,
    user: {
      id: result.id,
      email: result.email,
      emailVerifiedAt: result.emailVerifiedAt,
    },
  };
}

export async function resendEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw createNotFoundError("User not found.");
  }

  if (user.emailVerifiedAt) {
    return {
      sent: false,
      alreadyVerified: true,
      message: "Your email is already verified. You can sign in.",
      expiresAt: null as Date | null,
      devVerificationUrl: null as string | null,
    };
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  const result = await sendEmailVerificationForUser(userId);

  const organizationId = await getPrimaryOrganizationId(userId);

  if (organizationId) {
    await prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action: "EMAIL_VERIFICATION_RESENT",
        metadata: {
          email: user.email,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    ...result,
    alreadyVerified: false,
    message: result.sent
      ? "Verification email sent. Please check your inbox."
      : isProduction
        ? "Could not send verification email yet. Please try again shortly or contact support."
        : "Verification link ready. Please check your email or use the development link.",
  };
}

/**
 * Public resend by email. Always returns a generic message to avoid account enumeration.
 */
export async function resendEmailVerificationByEmail(email: string) {
  const genericMessage =
    "If an account exists for that email and is not yet verified, a verification email has been sent.";

  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
  });

  if (!user || user.emailVerifiedAt) {
    return {
      sent: false,
      alreadyVerified: Boolean(user?.emailVerifiedAt),
      message: genericMessage,
      expiresAt: null as Date | null,
      devVerificationUrl: null as string | null,
    };
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  const result = await sendEmailVerificationForUser(user.id);

  const organizationId = await getPrimaryOrganizationId(user.id);

  if (organizationId) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: "EMAIL_VERIFICATION_RESENT",
        metadata: {
          email: user.email,
          mode: "public_email",
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    ...result,
    alreadyVerified: false,
    message: genericMessage,
  };
}
