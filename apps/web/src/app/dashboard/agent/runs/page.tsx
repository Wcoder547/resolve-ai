import { AgentRunsDashboard } from "@/components/agent/AgentRunsDashboard";

export default function AgentRunsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <AgentRunsDashboard />
      </div>
    </main>
  );
}