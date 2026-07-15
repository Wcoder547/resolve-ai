"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "../ui/button";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Contains number", pass: /\d/.test(password) },
    { label: "Contains special character", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength ? colors[strength - 1] : "bg-[#334155]"}`}
          />
        ))}
      </div>
      {strength > 0 && (
        <div className="text-xs text-slate-500">{labels[strength - 1]} password</div>
      )}
      <div className="space-y-1">
        {checks.map(({ label, pass }) => (
          <div key={label} className={`flex items-center gap-1.5 text-xs ${pass ? "text-emerald-400" : "text-slate-600"}`}>
            {pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", org: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Work email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.org.trim()) e.org = "Organization name is required";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push("/onboarding"); }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-semibold text-slate-50 text-[15px]">Resolve<span className="text-cyan-400">AI</span></span>
        </div>

        <h1 className="text-2xl font-bold text-slate-50 mb-1">Create your workspace</h1>
        <p className="text-sm text-slate-500 mb-8">Start resolving support issues with grounded AI.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              placeholder="Jane Doe"
              className={`w-full bg-[#0F172A] border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors
                ${errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#334155] focus:border-cyan-400 focus:ring-cyan-400/20"}`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Work email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              placeholder="jane@company.com"
              className={`w-full bg-[#0F172A] border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors
                ${errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#334155] focus:border-cyan-400 focus:ring-cyan-400/20"}`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => update("password", e.target.value)}
                placeholder="Create a strong password"
                className={`w-full bg-[#0F172A] border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors pr-10
                  ${errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#334155] focus:border-cyan-400 focus:ring-cyan-400/20"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            <PasswordStrength password={form.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization name</label>
            <input
              type="text"
              value={form.org}
              onChange={e => update("org", e.target.value)}
              placeholder="Acme Corp"
              className={`w-full bg-[#0F172A] border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors
                ${errors.org ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#334155] focus:border-cyan-400 focus:ring-cyan-400/20"}`}
            />
            {errors.org && <p className="text-xs text-red-400 mt-1">{errors.org}</p>}
            <p className="text-xs text-slate-600 mt-1.5">Your organization workspace will be created automatically.</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold h-10 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                Creating workspace...
              </span>
            ) : "Create workspace"}
          </Button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Sign in
          </button>
        </p>
        <p className="text-[11px] text-slate-600 text-center mt-3 leading-relaxed">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
