"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getCurrentOrganization,
  getCurrentUser,
  getOrganizationMembers,
  logoutUser,
} from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import type { AuthOrganization, AuthUser } from "@/types/auth";
import Link from "next/link";

type DashboardOrganization = AuthOrganization & {
  plan: string;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] =
    useState<DashboardOrganization | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [userResponse, organizationResponse, membersResponse] =
          await Promise.all([
            getCurrentUser(),
            getCurrentOrganization(),
            getOrganizationMembers(),
          ]);

        setUser(userResponse.data.user);
        setOrganization(organizationResponse.data.organization);
        setMembersCount(membersResponse.data.members.length);
      } catch {
        clearTokens();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      clearTokens();
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-800 bg-slate-900/70 p-6 lg:block">
        <div>
          <h2 className="text-xl font-bold">ResolveAI</h2>
          <p className="mt-1 text-sm text-slate-400">
            Agentic support platform
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
          >
            Overview
          </Link>

          <Link
            href="/dashboard/knowledge"
            className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            Knowledge Base
          </Link>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Tickets
          </a>

          <Link
            href="/dashboard/chat"
            className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            AI Chat
          </Link>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Agent Runs
          </a>

          <a className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">
            Settings
          </a>
        </nav>
      </aside>

      <section className="lg:pl-72">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-5">
          <div>
            <p className="text-sm text-slate-400">Dashboard</p>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Logout
          </button>
        </header>

        <div className="p-6">
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Active workspace</p>

            <h2 className="mt-2 text-xl font-semibold">
              {organization?.name || "No organization"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-300">
                Role: {organization?.role || "N/A"}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                Plan: {organization?.plan || "FREE"}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                Members: {membersCount}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                Slug: {organization?.slug || "N/A"}
              </span>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm text-slate-400">Knowledge sources</p>
              <h3 className="mt-3 text-3xl font-bold">0</h3>
              <p className="mt-2 text-sm text-slate-500">Documents indexed</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm text-slate-400">Tickets</p>
              <h3 className="mt-3 text-3xl font-bold">0</h3>
              <p className="mt-2 text-sm text-slate-500">Open support issues</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm text-slate-400">AI conversations</p>
              <h3 className="mt-3 text-3xl font-bold">0</h3>
              <p className="mt-2 text-sm text-slate-500">RAG chat sessions</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm text-slate-400">Agent runs</p>
              <h3 className="mt-3 text-3xl font-bold">0</h3>
              <p className="mt-2 text-sm text-slate-500">Workflow executions</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Next implementation steps</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <p className="font-medium">1. Knowledge base</p>
                <p className="mt-2 text-sm text-slate-400">
                  Upload docs and prepare them for RAG ingestion.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <p className="font-medium">2. Ticket system</p>
                <p className="mt-2 text-sm text-slate-400">
                  Create support tickets and classify them with AI.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <p className="font-medium">3. AI chat</p>
                <p className="mt-2 text-sm text-slate-400">
                  Ask source-grounded questions from company knowledge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
