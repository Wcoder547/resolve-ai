"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { ApiError, registerUser } from "@/lib/api";
import { saveTokens, saveUser, saveOrganization } from "@/lib/auth";
import { AuthBrandPanel, AuthShell } from "./AuthShell";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a letter", pass: /[A-Za-z]/.test(password) },
    { label: "Contains a number", pass: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-500", "bg-yellow-500", "bg-signal"];
  const labels = ["Weak", "Fair", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < strength ? colors[strength - 1] : "bg-muted"
            }`}
          />
        ))}
      </div>
      {strength > 0 ? (
        <div className="text-xs text-muted-foreground">{labels[strength - 1]} password</div>
      ) : null}
      <div className="space-y-1">
        {checks.map(({ label, pass }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 text-xs ${
              pass ? "text-signal" : "text-muted-foreground"
            }`}
          >
            {pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    org: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = "Enter your full name.";
    }
    if (!form.email.trim()) next.email = "Enter your work email.";
    if (!isValidPassword(form.password)) {
      next.password =
        "Password must be at least 8 characters with a letter and a number.";
    }
    if (!form.org.trim() || form.org.trim().length < 2) {
      next.org = "Enter an organization name.";
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        organizationName: form.org,
      });
      saveTokens(res.data.tokens, true);
      saveUser(res.data.user);
      saveOrganization(res.data.organization);
      router.push(
        `/auth/check-email?email=${encodeURIComponent(form.email.trim())}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = { form: err.message };
        for (const [key, values] of Object.entries(err.errors)) {
          if (values?.[0]) {
            const uiKey =
              key === "organizationName"
                ? "org"
                : key === "password"
                  ? "password"
                  : key;
            mapped[uiKey] = values[0];
          }
        }
        setErrors(mapped);
      } else {
        setErrors({
          form:
            err instanceof Error
              ? err.message
              : "Registration failed. Please try again.",
        });
      }
      setLoading(false);
    }
  };

  return (
    <AuthShell panel={<AuthBrandPanel />}>
      <h1 className="font-display text-3xl text-foreground mb-1 tracking-tight">
        Create your workspace
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Start resolving with grounded AI.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {errors.form ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            {errors.form}
          </div>
        ) : null}

        {(
          [
            ["name", "Full name", "Jane Doe"],
            ["email", "Work email", "jane@company.com"],
            ["org", "Organization name", "Acme Corp"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              {label}
            </label>
            <input
              type={key === "email" ? "email" : "text"}
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-card border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
                errors[key]
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-border focus:border-brand focus:ring-brand/20"
              }`}
            />
            {errors[key] ? (
              <p className="text-xs text-red-700 mt-1">{errors[key]}</p>
            ) : null}
            {key === "org" ? (
              <p className="text-xs text-muted-foreground mt-1.5">
                Verify your email before signing in.
              </p>
            ) : null}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Create a strong password"
              className={`w-full bg-card border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors pr-10 ${
                errors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-border focus:border-brand focus:ring-brand/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-red-700 mt-1">{errors.password}</p>
          ) : null}
          <PasswordStrength password={form.password} />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 font-semibold h-10 text-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" />
              Creating workspace...
            </span>
          ) : (
            "Create workspace"
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline font-medium">
          Sign in
        </Link>
      </p>
      <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
