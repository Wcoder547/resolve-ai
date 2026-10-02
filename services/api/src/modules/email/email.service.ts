import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type ResolvedTransport = {
  source: "resend" | "smtp";
  transporter: nodemailer.Transporter;
  from: string;
};

function resolveTransport(): ResolvedTransport | null {
  // Prefer Resend free tier (same pattern as Vynuro internal tool).
  if (env.RESEND_API_KEY) {
    const from =
      env.RESEND_FROM || env.EMAIL_FROM || "ResolveAI <onboarding@resend.dev>";

    return {
      source: "resend",
      transporter: nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: env.RESEND_API_KEY,
        },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
      }),
      from,
    };
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return {
      source: "smtp",
      transporter: nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
      }),
      from: env.EMAIL_FROM,
    };
  }

  return null;
}

export function isEmailConfigured() {
  return resolveTransport() !== null;
}

export async function sendEmail(input: SendEmailInput) {
  const resolved = resolveTransport();

  if (!resolved) {
    logger.warn(
      {
        to: input.to,
        subject: input.subject,
        text: input.text,
      },
      "Email is not configured (Resend or SMTP). Message was not sent. Development fallback logged.",
    );

    return {
      sent: false as const,
      reason: "SMTP_NOT_CONFIGURED" as const,
    };
  }

  try {
    await resolved.transporter.sendMail({
      from: resolved.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return {
      sent: true as const,
      source: resolved.source,
    };
  } catch (error) {
    logger.error(
      {
        to: input.to,
        subject: input.subject,
        source: resolved.source,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "Unknown mail error",
        },
      },
      "Failed to send email",
    );

    return {
      sent: false as const,
      reason: "EMAIL_SEND_FAILED" as const,
    };
  }
}

export async function sendVerificationEmail(input: {
  email: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const displayName = input.name || "there";

  const subject = "Verify your ResolveAI email address";

  const text = `Hi ${displayName},

Please verify your email address by opening this link:

${input.verificationUrl}

This link will expire soon.

If you did not create a ResolveAI account, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>Verify your email address</h2>
      <p>Hi ${displayName},</p>
      <p>Please verify your email address to activate your ResolveAI account.</p>
      <p>
        <a href="${input.verificationUrl}" style="display:inline-block;background:#020617;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;">${input.verificationUrl}</p>
      <p>This link will expire soon.</p>
      <p>If you did not create a ResolveAI account, you can ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: input.email,
    subject,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name?: string | null;
  resetUrl: string;
}) {
  const displayName = input.name || "there";

  const subject = "Reset your ResolveAI password";

  const text = `Hi ${displayName},

We received a request to reset your ResolveAI password. Open this link to choose a new password:

${input.resetUrl}

This link will expire soon. If you did not request a password reset, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>Reset your password</h2>
      <p>Hi ${displayName},</p>
      <p>We received a request to reset your ResolveAI password.</p>
      <p>
        <a href="${input.resetUrl}" style="display:inline-block;background:#020617;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;">${input.resetUrl}</p>
      <p>This link will expire soon.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: input.email,
    subject,
    html,
    text,
  });
}

export async function sendOrganizationInviteEmail(input: {
  email: string;
  organizationName: string;
  inviterName?: string | null;
  role: string;
  inviteUrl: string;
}) {
  const inviter = input.inviterName || "A teammate";
  const roleLabel = input.role.toLowerCase().replace(/_/g, " ");

  const subject = `You've been invited to ${input.organizationName} on ResolveAI`;

  const text = `Hi,

${inviter} invited you to join ${input.organizationName} on ResolveAI as ${roleLabel}.

Accept the invitation:

${input.inviteUrl}

This link will expire soon. If you were not expecting this email, you can ignore it.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>You're invited to ${input.organizationName}</h2>
      <p>Hi,</p>
      <p>${inviter} invited you to join <strong>${input.organizationName}</strong> on ResolveAI as <strong>${roleLabel}</strong>.</p>
      <p>
        <a href="${input.inviteUrl}" style="display:inline-block;background:#020617;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Accept invitation
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;">${input.inviteUrl}</p>
      <p>This link will expire soon.</p>
    </div>
  `;

  return sendEmail({
    to: input.email,
    subject,
    html,
    text,
  });
}
