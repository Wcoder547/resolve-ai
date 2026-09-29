"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { forgotPassword } from "@/lib/api";
import { AuthShell } from "./AuthShell";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(
        res.message ||
          "If an account exists for that email, a password reset link has been sent.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send a reset link. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-foreground mb-1">Forgot password</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Enter your work email and we&apos;ll send a reset link if an account exists.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="bg-signal-soft text-signal border border-signal/20 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            Work email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            "Sending..."
          ) : (
            <span className="flex items-center gap-2">
              Send reset link <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Remembered your password?{" "}
        <Link href="/login" className="text-brand hover:underline font-medium">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
