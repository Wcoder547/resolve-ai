import { AgentRunDetailView } from "@/components/agent/AgentRunDetailView";

type PageProps = {
  params: {
    agentRunId: string;
  };
};

export default function AgentRunDetailPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <AgentRunDetailView agentRunId={params.agentRunId} />
      </div>
    </main>
  );
}