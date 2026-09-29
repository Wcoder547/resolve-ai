"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { ApiError, loginUser, resendEmailVerification } from "@/lib/api";
import { saveTokens, saveUser, saveOrganization } from "@/lib/auth";
import { AuthBrandPanel, AuthShell } from "./AuthShell";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const canResend = useMemo(
    () => needsVerification && Boolean(email.trim()),
    [needsVerification, email],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: Record<string, string> = {};
    if (!email.trim()) nextFieldErrors.email = "Please enter your email.";
    if (!password) nextFieldErrors.password = "Please enter your password.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setFieldErrors({});
    setNeedsVerification(false);
    setResendMessage("");
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      saveTokens(res.data.tokens, remember);
      saveUser(res.data.user);
      saveOrganization(res.data.organization);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_NOT_VERIFIED" || err.status === 403) {
          setNeedsVerification(true);
          setError(
            err.message || "Please verify your email before logging in.",
          );
        } else {
          setError(err.message);
          if (err.errors) {
            const mapped: Record<string, string> = {};
            for (const [key, values] of Object.entries(err.errors)) {
              if (values?.[0]) mapped[key] = values[0];
            }
            setFieldErrors(mapped);
          }
        }
      } else {
        setError(
          err instanceof Error ? err.message : "Sign in failed. Please try again.",
        );
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: "Enter your email to resend verification." });
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await resendEmailVerification(email.trim());
      setResendMessage(
        res.data?.devVerificationUrl
          ? `Development verification link: ${res.data.devVerificationUrl}`
          : res.message ||
              "If an account exists and is unverified, a verification email has been sent.",
      );
    } catch (err) {
      setResendMessage(
        err instanceof Error
          ? err.message
          : "Could not resend verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthShell panel={<AuthBrandPanel />}>
      <h1 className="font-display text-3xl text-foreground mb-1 tracking-tight">
        Welcome back
      </h1>
      <p className="text-sm text-muted-foreground mb-8">Sign in to your workspace</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              needsVerification
                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
            }`}
          >
            <p>{error}</p>
            {needsVerification ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  disabled={!canResend || resendLoading}
                  onClick={() => void handleResend()}
                  className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
                >
                  {resendLoading
                    ? "Sending verification email..."
                    : "Resend verification email"}
                </button>
                {resendMessage ? (
                  <p className="text-xs text-foreground/80 break-all">
                    {resendMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
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
            className={`w-full bg-card border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
              fieldErrors.email
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                : "border-border focus:border-brand focus:ring-brand/30"
            }`}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-red-700 mt-1">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground/80">Password</label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-brand hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-card border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors pr-10 ${
                fieldErrors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                  : "border-border focus:border-brand focus:ring-brand/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="text-xs text-red-700 mt-1">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-card accent-[var(--brand)] cursor-pointer"
          />
          <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
            Remember me
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign in <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand hover:underline font-medium">
          Create account
        </Link>
      </p>
    </AuthShell>
  );
}
