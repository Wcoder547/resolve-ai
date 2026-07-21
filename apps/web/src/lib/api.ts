import { getAccessToken } from "@/lib/auth";

import type {
  CurrentOrganizationResponse,
  LoginResponse,
  MeResponse,
  OrganizationMembersResponse,
  RegisterResponse
} from "@/types/auth";

import type {
  CreateIntegrationPayload,
  CreateIntegrationResponse,
  DeleteIntegrationResponse,
  ListIntegrationsResponse,
  IntegrationStatus,
  UpdateIntegrationStatusResponse
} from "@/types/integrations";

import type {
  DeleteKnowledgeSourceResponse,
  GetKnowledgeSourceResponse,
  IngestKnowledgeSourceResponse,
  ListKnowledgeSourcesResponse,
  SearchKnowledgeResponse,
  UploadKnowledgeResponse
} from "@/types/knowledge";

import type {
  AskChatResponse,
  AskAgenticChatResponse,
  DeleteChatConversationResponse,
  GetChatConversationResponse,
  ListChatConversationsResponse
} from "@/types/chat";

import type {
  AgentRunDetailResponse,
  AgentRunTimelineResponse,
  AgentRunsSummaryResponse,
  ApproveToolCallResponse,
  ListAgentRunsResponse,
  PendingToolCallsResponse,
  RejectToolCallResponse
} from "@/types/agentic";

import type {
  AiUsageSummaryResponse,
  ListAiUsageEventsResponse
} from "@/types/usage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is missing.");
}

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  organizationName: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class RateLimitError extends ApiError {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(
      message || `Rate limited. Try again in ${retryAfterSeconds}s.`,
      429
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  // Some error responses (e.g. from a rate limiter sitting in front of the
  // app) may not have a JSON body — don't let a parse failure mask the
  // real status.
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorBody = data as { message?: string } | null;
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      throw new RateLimitError(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
        errorBody?.message
      );
    }
    throw new ApiError(errorBody?.message || "Something went wrong.", response.status);
  }

  return data as TResponse;
}

export function registerUser(payload: RegisterPayload) {
  return request<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload: LoginPayload) {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCurrentUser() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<MeResponse>("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function logoutUser() {
  const token = getAccessToken();

  if (!token) {
    return Promise.resolve({
      success: true,
      message: "Logged out locally."
    });
  }

  return request<{ success: boolean; message: string }>("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


export function getCurrentOrganization() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<CurrentOrganizationResponse>("/api/v1/organizations/current", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getOrganizationMembers() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<OrganizationMembersResponse>("/api/v1/organizations/members", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}



export async function uploadKnowledgeFile(file: File, name?: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  const formData = new FormData();
  formData.append("file", file);

  if (name?.trim()) {
    formData.append("name", name.trim());
  }

  const response = await fetch(`${API_URL}/api/v1/knowledge/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "File upload failed.");
  }

  return data as UploadKnowledgeResponse;
}

// NOTE: knowledge.routes.ts mounts these directly under /api/v1/knowledge
// with no "/sources" segment (router.get("/"), router.get("/:sourceId"),
// etc.) — these four calls previously pointed at "/knowledge/sources..."
// which doesn't exist on the router and would 404.
export function listKnowledgeSources() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListKnowledgeSourcesResponse>("/api/v1/knowledge/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getKnowledgeSource(sourceId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<GetKnowledgeSourceResponse>(
    `/api/v1/knowledge/${sourceId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function ingestKnowledgeSource(sourceId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<IngestKnowledgeSourceResponse>(
    `/api/v1/knowledge/${sourceId}/ingest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function deleteKnowledgeSource(sourceId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<DeleteKnowledgeSourceResponse>(
    `/api/v1/knowledge/${sourceId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}


export function searchKnowledge(query: string, limit = 5) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<SearchKnowledgeResponse>("/api/v1/knowledge/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      limit
    })
  });
}


export function askChatQuestion(
  question: string,
  conversationId?: string | null,
  limit = 5
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AskChatResponse>("/api/v1/chat/ask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      question,
      conversationId: conversationId || undefined,
      limit
    })
  });
}

// Same payload as askChatQuestion, but hits the agentic endpoint — this is
// the one that actually creates an AgentRun record (steps, tool calls,
// approval gating), which is what powers the Agent Runs and Approvals pages.
export function askAgenticChatQuestion(
  question: string,
  conversationId?: string | null,
  limit = 5
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AskAgenticChatResponse>("/api/v1/chat/agent/ask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      question,
      conversationId: conversationId || undefined,
      limit
    })
  });
}


export function listChatConversations() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListChatConversationsResponse>("/api/v1/chat/conversations", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getChatConversation(conversationId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<GetChatConversationResponse>(
    `/api/v1/chat/conversations/${conversationId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function deleteChatConversation(conversationId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<DeleteChatConversationResponse>(
    `/api/v1/chat/conversations/${conversationId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

type ListAgentRunsParams = {
  status?: string;
  conversationId?: string;
  limit?: number;
  from?: string;
  to?: string;
};

export function listAgentRuns(params: ListAgentRunsParams = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.conversationId) search.set("conversationId", params.conversationId);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);

  const qs = search.toString();

  return request<ListAgentRunsResponse>(
    `/api/v1/chat/agent/runs${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function getAgentRunsSummary() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AgentRunsSummaryResponse>("/api/v1/chat/agent/runs/summary", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getAgentRunDetail(agentRunId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AgentRunDetailResponse>(
    `/api/v1/chat/agent/runs/${agentRunId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function getAgentRunTimeline(agentRunId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AgentRunTimelineResponse>(
    `/api/v1/chat/agent/runs/${agentRunId}/timeline`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function listPendingToolCalls() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<PendingToolCallsResponse>(
    "/api/v1/chat/agent/tool-calls/pending",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function approveToolCall(toolCallId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ApproveToolCallResponse>(
    `/api/v1/chat/agent/tool-calls/${toolCallId}/approve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function rejectToolCall(toolCallId: string, reason?: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<RejectToolCallResponse>(
    `/api/v1/chat/agent/tool-calls/${toolCallId}/reject`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason: reason || undefined })
    }
  );
}

export function listIntegrations() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListIntegrationsResponse>("/api/v1/integrations", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createIntegration(payload: CreateIntegrationPayload) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<CreateIntegrationResponse>("/api/v1/integrations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateIntegrationStatus(
  integrationId: string,
  status: IntegrationStatus
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpdateIntegrationStatusResponse>(
    `/api/v1/integrations/${integrationId}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    }
  );
}

export function deleteIntegration(integrationId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<DeleteIntegrationResponse>(
    `/api/v1/integrations/${integrationId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function getAiUsageSummary() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<AiUsageSummaryResponse>("/api/v1/usage/ai/summary", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function listAiUsageEvents(limit = 20) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListAiUsageEventsResponse>(
    `/api/v1/usage/ai/events?limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}