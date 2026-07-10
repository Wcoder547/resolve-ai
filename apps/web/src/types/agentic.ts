export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AgentCitation = {
  label: string;
  sourceId: string;
  sourceName: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  reason?: string | null;
};

export type AgentStep = {
  id?: string;
  agentName: string;
  status: string;
  provider?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string | null;
  createdAt?: string;
};

export type AgentToolCall = {
  id?: string;
  toolCallId?: string | null;
  toolName: string;
  toolCategory?: string | null;
  requiresApproval: boolean;
  approvalStatus: string;
  status: string;
  reason?: string | null;
  latencyMs?: number | null;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string | null;
  createdAt?: string;
};

export type AgentRunLite = {
  id: string;
  externalRunId?: string | null;
  status: string;
  question: string;
  standaloneQuestion?: string | null;
  grounded: boolean;
  confidence?: string | null;
  needsEscalation: boolean;
  escalationReason?: string | null;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  fallbackUsed: boolean;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  durationMs?: number | null;
  conversation?: {
    id: string;
    title: string | null;
  } | null;
  _count?: {
    steps: number;
    toolCalls: number;
  };
};

export type AgentRunDetail = AgentRunLite & {
  answer?: string | null;
  agentsUsed?: string[] | null;
  citations?: AgentCitation[] | null;
  triage?: Record<string, unknown> | null;
  retrievalReview?: Record<string, unknown> | null;
  diagnostic?: Record<string, unknown> | null;
  resolution?: Record<string, unknown> | null;
  qa?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  providerErrors?: string[] | null;
  steps: AgentStep[];
  toolCalls: AgentToolCall[];
  user?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  message?: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  } | null;
};

export type AgentTimelineEvent = {
  type: string;
  status: string;
  title: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type AskAgentResponse = {
  conversationId: string;
  messageId: string;
  answer: string;
  grounded: boolean;
  confidence: string;
  needsEscalation: boolean;
  escalationReason?: string | null;
  citations: AgentCitation[];
  agentRun: {
    id: string;
    externalRunId?: string | null;
    status: string;
    agentsUsed: string[];
    steps: AgentStep[];
    toolCalls: AgentToolCall[];
    triage: Record<string, unknown>;
    retrievalReview: Record<string, unknown>;
    diagnostic: Record<string, unknown>;
    resolution: Record<string, unknown>;
    qa: Record<string, unknown>;
    provider: string;
    model: string;
    promptVersion: string;
    fallbackUsed: boolean;
    providerErrors: string[];
  } | null;
  originalQuestion: string;
  standaloneQuestion: string;
  wasFollowUp: boolean;
  conversationHistoryMessages: number;
  retrievalMode: string;
};

export type PendingToolCall = AgentToolCall & {
  agentRun: {
    id: string;
    externalRunId?: string | null;
    question: string;
    standaloneQuestion?: string | null;
    status: string;
    confidence?: string | null;
    needsEscalation: boolean;
    createdAt: string;
  };
};