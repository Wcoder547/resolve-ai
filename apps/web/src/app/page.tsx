import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
          AI-first SaaS for support and incident resolution
        </div>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Resolve customer issues faster with an agentic AI support platform.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          ResolveAI helps SaaS teams upload knowledge, ask source-grounded
          questions, triage support tickets, and run human-approved AI
          workflows.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start free
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}