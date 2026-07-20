import { getAccessToken } from "@/lib/auth";

import type {
  CurrentOrganizationResponse,
  LoginResponse,
  MeResponse,
  OrganizationMembersResponse,
  RegisterResponse
} from "@/types/auth";

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data as TResponse;
}

export function registerUser(payload: RegisterPayload) {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload: LoginPayload) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCurrentUser() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<MeResponse>("/api/auth/me", {
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

  return request<{ success: boolean; message: string }>("/api/auth/logout", {
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

  return request<CurrentOrganizationResponse>("/api/organizations/current", {
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

  return request<OrganizationMembersResponse>("/api/organizations/members", {
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

  const response = await fetch(`${API_URL}/api/knowledge/upload`, {
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

export function listKnowledgeSources() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListKnowledgeSourcesResponse>("/api/knowledge/sources", {
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
    `/api/knowledge/sources/${sourceId}`,
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
    `/api/knowledge/sources/${sourceId}/ingest`,
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
    `/api/knowledge/sources/${sourceId}`,
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

  return request<SearchKnowledgeResponse>("/api/knowledge/search", {
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

  return request<AskChatResponse>("/api/chat/ask", {
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

  return request<ListChatConversationsResponse>("/api/chat/conversations", {
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
    `/api/chat/conversations/${conversationId}`,
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
    `/api/chat/conversations/${conversationId}`,
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
    `/api/chat/agent/runs${qs ? `?${qs}` : ""}`,
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

  return request<AgentRunsSummaryResponse>("/api/chat/agent/runs/summary", {
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
    `/api/chat/agent/runs/${agentRunId}`,
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
    `/api/chat/agent/runs/${agentRunId}/timeline`,
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
    "/api/chat/agent/tool-calls/pending",
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
    `/api/chat/agent/tool-calls/${toolCallId}/approve`,
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
    `/api/chat/agent/tool-calls/${toolCallId}/reject`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason: reason || undefined })
    }
  );
}