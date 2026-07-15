"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/app");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] xl:w-[560px] bg-[#0F172A] border-r border-[#1E293B] p-10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-semibold text-slate-50 text-[15px]">Resolve<span className="text-cyan-400">AI</span></span>
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-50 mb-3">
            AI support powered by your knowledge base.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Grounded answers, visible sources, and full AI transparency for support and operations teams.
          </p>

          {/* Product preview */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                <Zap className="w-3 h-3 text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-slate-300">ResolveAI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">✓ Grounded</span>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              The subscription remains inactive because the webhook event was not delivered. Check the Stripe dashboard and manually trigger activation.
            </p>
            <div className="flex gap-2">
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span className="text-[11px] font-medium text-slate-300">Billing Runbook</span>
                </div>
                <div className="text-[10px] text-slate-500">Chunk 04 · 0.94</div>
              </div>
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span className="text-[11px] font-medium text-slate-300">Support KB</span>
                </div>
                <div className="text-[10px] text-slate-500">Chunk 11 · 0.87</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              "Grounded answers with exact source citations",
              "Human review before AI replies are sent",
              "Full AI execution trace for every run",
            ].map(text => (
              <div key={text} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600 mt-8">
          © 2025 ResolveAI · Privacy · Terms
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-semibold text-slate-50 text-[15px]">Resolve<span className="text-cyan-400">AI</span></span>
          </div>

          <h1 className="text-2xl font-bold text-slate-50 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] accent-cyan-400 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">Remember me</label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold h-10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Don't have an account?{" "}
            <button
              onClick={() => router.push("/register")}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
