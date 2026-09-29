import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { createSecureToken, hashSecureToken } from "../../lib/secure-token.js";
import { hashPassword } from "../../utils/password.js";
import { sendPasswordResetEmail } from "../email/email.service.js";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./password-reset.validation.js";

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

function createBadRequestError(message: string) {
  const error = new Error(message);
  error.name = "BadRequestError";
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

export async function requestPasswordReset(input: ForgotPasswordInput) {
  if(input.email.trim() === "") {
    throw createBadRequestError("Email is required.");
  }
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    logger.info(
      {
        email: input.email,
      },
      "Password reset requested for unknown email",
    );

    return {
      sent: false,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    };
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  const token = createSecureToken(32);
  const tokenHash = hashSecureToken(token);
  const expiresAt = addMinutes(new Date(), env.PASSWORD_RESET_TOKEN_TTL_MINUTES);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(
    token,
  )}`;

  const emailResult = await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetUrl,
  });

  const organizationId = await getPrimaryOrganizationId(user.id);

  if (organizationId) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: "PASSWORD_RESET_REQUESTED",
        metadata: {
          email: user.email,
        } as Prisma.InputJsonValue,
      },
    });
  }

  logger.info(
    {
      userId: user.id,
      email: user.email,
      expiresAt,
      resetUrl: emailResult.sent === false ? resetUrl : "[sent-by-email]",
    },
    "Password reset token created",
  );

  return {
    sent: emailResult.sent,
    message: GENERIC_FORGOT_PASSWORD_MESSAGE,
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashSecureToken(input.token.trim());

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!resetToken) {
    throw createBadRequestError("Invalid or expired reset token.");
  }

  if (resetToken.usedAt) {
    throw createConflictError("This reset token has already been used.");
  }

  if (resetToken.expiresAt.getTime() < Date.now()) {
    throw createBadRequestError("Reset token has expired.");
  }

  const passwordHash = await hashPassword(input.password);
  const organizationId = await getPrimaryOrganizationId(resetToken.userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: {
          not: resetToken.id,
        },
      },
    });

    await tx.refreshToken.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (organizationId) {
      await tx.auditLog.create({
        data: {
          userId: resetToken.userId,
          organizationId,
          action: "PASSWORD_RESET_COMPLETED",
          metadata: {
            email: resetToken.user.email,
            tokenId: resetToken.id,
          } as Prisma.InputJsonValue,
        },
      });
    }
  });

  return {
    reset: true,
    message: "Password has been reset successfully.",
  };
}
