"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "../ui/button";
import { resendEmailVerification } from "@/lib/api";
import { canShowDevAuthLinks } from "@/lib/dev-auth-links";
import { AuthShell } from "./AuthShell";

type CheckEmailClientProps = {
  email?: string;
};

export function CheckEmailClient({ email }: CheckEmailClientProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResend = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await resendEmailVerification(email);
      setMessage(
        canShowDevAuthLinks() && res.data?.devVerificationUrl
          ? `Development verification link: ${res.data.devVerificationUrl}`
          : res.message ||
              "If an account exists and is unverified, a verification email has been sent.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not resend verification email.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell maxWidth="md">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-brand/20 bg-brand-soft text-brand">
          <Mail className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We sent a verification link
          {email ? (
            <>
              {" "}
              to <span className="text-foreground">{email}</span>
            </>
          ) : null}
          . Please verify before signing in.
        </p>

        {message ? (
          <p className="mt-4 break-all text-sm text-signal">{message}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            disabled={loading || !email}
            onClick={() => void handleResend()}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm disabled:opacity-60"
          >
            {loading ? "Sending..." : "Resend verification email"}
          </Button>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground"
          >
            Back to login
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
