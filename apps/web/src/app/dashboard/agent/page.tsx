import { AgentAskConsole } from "@/components/agent/AgentAskConsole";

export default function AgentConsolePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <AgentAskConsole />
      </div>
    </main>
  );
}