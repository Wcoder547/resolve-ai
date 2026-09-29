"use client";

import { useState } from "react";
import { resendEmailVerification } from "@/lib/api";

export function ResendVerificationButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await resendEmailVerification();

      setMessage(
        response.data?.devVerificationUrl
          ? `Development verification link: ${response.data.devVerificationUrl}`
          : response.message ||
              "Verification email sent. Please check your inbox.",
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
  }

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <p className="text-sm text-amber-800/90">
        Please verify your email before using protected features. Check your
        inbox for the verification link.
      </p>

      <button
        type="button"
        onClick={() => void resend()}
        disabled={loading}
        className="mt-3 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      >
        {loading ? "Sending..." : "Resend verification email"}
      </button>

      {message ? (
        <p className="mt-3 break-all text-sm text-signal">{message}</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
