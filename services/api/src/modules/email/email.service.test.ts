import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isEmailConfigured,
  sendOrganizationInviteEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email.service.js";

describe("Email service builders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports email as unconfigured without Resend or SMTP", () => {
    expect(isEmailConfigured()).toBe(false);
  });

  it("builds verification, reset, and invite emails without SMTP", async () => {
    const verification = await sendVerificationEmail({
      email: "user@example.com",
      name: "Ada",
      verificationUrl: "https://app.example.com/verify?token=abc",
    });

    expect(verification.sent).toBe(false);
    expect(verification.reason).toBe("SMTP_NOT_CONFIGURED");

    const reset = await sendPasswordResetEmail({
      email: "user@example.com",
      name: "Ada",
      resetUrl: "https://app.example.com/reset?token=abc",
    });

    expect(reset.sent).toBe(false);

    const invite = await sendOrganizationInviteEmail({
      email: "invitee@example.com",
      organizationName: "ResolveAI",
      inviterName: "Ada",
      role: "VIEWER",
      inviteUrl: "https://app.example.com/invite?token=abc",
    });

    expect(invite.sent).toBe(false);
  });
});
