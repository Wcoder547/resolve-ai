"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { resendEmailVerification, verifyEmail } from "@/lib/api";
import { canShowDevAuthLinks } from "@/lib/dev-auth-links";
import { Button } from "../ui/button";
import { AuthShell } from "./AuthShell";

type VerifyEmailClientProps = {
  token?: string;
};

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email address...");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage(
          "Verification token is missing. Open the link from your email, or request a new verification email.",
        );
        return;
      }

      try {
        await verifyEmail(token);
        setStatus("success");
        setMessage(
          "Your email has been verified successfully. You can now sign in.",
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Email verification failed. Please request a new link.",
        );
      }
    }

    void verify();
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      setResendMessage("Enter your email to resend verification.");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await resendEmailVerification(resendEmail.trim());
      setResendMessage(
        canShowDevAuthLinks() && res.data?.devVerificationUrl
          ? `Development verification link: ${res.data.devVerificationUrl}`
          : res.message ||
              "If an account exists and is unverified, a verification email has been sent.",
      );
    } catch (error) {
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Could not resend verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthShell maxWidth="md">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border ${
            status === "success"
              ? "border-signal/20 bg-signal-soft text-signal"
              : status === "error"
                ? "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {status === "success" ? (
            <CheckCircle className="h-6 w-6" />
          ) : status === "error" ? (
            <AlertCircle className="h-6 w-6" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" />
          )}
        </div>

        <h1 className="text-2xl font-semibold text-foreground">
          Email Verification
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>

        {status === "success" ? (
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-medium text-brand-foreground"
          >
            Go to Login
          </Link>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 space-y-3 text-left">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Resend verification email
              </label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground"
              />
            </div>
            {resendMessage ? (
              <p className="text-xs text-foreground/80 break-all">{resendMessage}</p>
            ) : null}
            <Button
              type="button"
              disabled={resendLoading}
              onClick={() => void handleResend()}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm"
            >
              {resendLoading ? "Sending..." : "Resend verification email"}
            </Button>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground"
            >
              Back to Login
            </Link>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}
