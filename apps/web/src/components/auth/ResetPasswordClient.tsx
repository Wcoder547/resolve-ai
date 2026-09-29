"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { ApiError, resetPassword } from "@/lib/api";
import { AuthShell } from "./AuthShell";

type ResetPasswordClientProps = {
  token?: string;
};

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Reset token is missing. Request a new password reset link.");
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not reset password. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-foreground mb-1">Reset password</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Choose a new password for your ResolveAI account.
      </p>

      {success ? (
        <div className="space-y-4">
          <div className="bg-signal-soft text-signal border border-signal/20 rounded-xl px-4 py-3 text-sm">
            Your password has been reset successfully. You can now sign in.
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              {error}
            </div>
          ) : null}

          {!token ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              This reset link is missing a token. Request a new one from the login
              page.
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              At least 8 characters, with one letter and one number.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              Confirm password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted-foreground text-center mt-6">
        <Link href="/login" className="text-brand hover:underline font-medium">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
