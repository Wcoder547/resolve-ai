import { getAccessToken, getRefreshToken } from "@/lib/auth";

import type {
  ChangePasswordResponse,
  CurrentOrganizationResponse,
  ForgotPasswordResponse,
  TransferOrganizationResponse,
  UpdateOrganizationResponse,
  ListOrganizationInvitesResponse,
  ListSessionsResponse,
  LoginResponse,
  MeResponse,
  OrganizationMembersResponse,
  PreviewOrganizationInviteResponse,
  UpdateOrganizationMemberResponse,
  AcceptOrganizationInviteResponse,
  CreateOrganizationInviteResponse,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  VerifyEmailResponse
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
  ChatStreamEvent,
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

import type { ListAuditLogsResponse } from "@/types/audit";
import type {
  ListAiProvidersResponse,
  NotificationPreferencesResponse,
  SetDefaultAiProviderResponse,
  UpsertAiProviderResponse,
  AiLlmProvider,
} from "@/types/settings";

import type {
  CreateTicketPayload,
  CreateTicketResponse,
  GetTicketResponse,
  ListTicketsParams,
  ListTicketsResponse,
  UpdateTicketPayload,
  UpdateTicketResponse,
} from "@/types/tickets";

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
  code?: string;
  errors?: Record<string, string[] | undefined>;

  constructor(
    message: string,
    status: number,
    options?: {
      code?: string;
      errors?: Record<string, string[] | undefined>;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.errors = options?.errors;
  }
}

export class RateLimitError extends ApiError {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(
      message || `Rate limited. Try again in ${retryAfterSeconds}s.`,
      429,
      { code: "RATE_LIMITED" },
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
    const errorBody = data as {
      message?: string;
      code?: string;
      errors?: Record<string, string[] | undefined>;
    } | null;
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      throw new RateLimitError(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
        errorBody?.message
      );
    }
    throw new ApiError(
      errorBody?.message || "Something went wrong.",
      response.status,
      {
        code: errorBody?.code,
        errors: errorBody?.errors,
      },
    );
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

export function verifyEmail(token: string) {
  return request<VerifyEmailResponse>("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token })
  });
}

export function resendEmailVerification(email?: string) {
  const token = getAccessToken();

  return request<ResendVerificationResponse>("/api/v1/auth/resend-verification", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(email ? { email } : {}),
  });
}

export function forgotPassword(email: string) {
  return request<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(token: string, password: string) {
  return request<ResetPasswordResponse>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ChangePasswordResponse>("/api/v1/auth/change-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function listSessions() {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListSessionsResponse>("/api/v1/auth/sessions", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {})
    }
  });
}

export function revokeSession(sessionId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<{ success: boolean; message: string }>(
    `/api/v1/auth/sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function revokeOtherSessions() {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  if (!refreshToken) {
    throw new Error("No refresh token found.");
  }

  return request<{ success: boolean; message: string }>(
    "/api/v1/auth/sessions/revoke-others",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ refreshToken })
    }
  );
}

export function logoutUser() {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

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
    },
    body: JSON.stringify(refreshToken ? { refreshToken } : {})
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

export function updateOrganization(payload: { name?: string; slug?: string }) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpdateOrganizationResponse>("/api/v1/organizations/current", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function transferOrganization(memberId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<TransferOrganizationResponse>("/api/v1/organizations/current/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ memberId })
  });
}

export function deleteOrganization(confirmName: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<{ success: boolean; message: string }>("/api/v1/organizations/current", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ confirmName })
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

export function updateOrganizationMember(
  memberId: string,
  role: "ADMIN" | "SUPPORT_AGENT" | "DEVELOPER" | "VIEWER"
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpdateOrganizationMemberResponse>(
    `/api/v1/organizations/members/${memberId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    }
  );
}

export function removeOrganizationMember(memberId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<{ success: boolean; message: string }>(
    `/api/v1/organizations/members/${memberId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function listOrganizationInvites() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListOrganizationInvitesResponse>("/api/v1/organizations/invites", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createOrganizationInvite(payload: {
  email: string;
  role: "ADMIN" | "SUPPORT_AGENT" | "DEVELOPER" | "VIEWER";
}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<CreateOrganizationInviteResponse>("/api/v1/organizations/invites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function resendOrganizationInvite(inviteId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<CreateOrganizationInviteResponse>(
    `/api/v1/organizations/invites/${inviteId}/resend`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function revokeOrganizationInvite(inviteId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<{ success: boolean; message: string }>(
    `/api/v1/organizations/invites/${inviteId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function previewOrganizationInvite(token: string) {
  return request<PreviewOrganizationInviteResponse>(
    `/api/v1/organizations/invites/preview?token=${encodeURIComponent(token)}`
  );
}

export function acceptOrganizationInvite(payload: {
  token: string;
  name?: string;
  password?: string;
}) {
  return request<AcceptOrganizationInviteResponse>(
    "/api/v1/organizations/invites/accept",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
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

function consumeSseJsonEvents(buffer: string): {
  events: unknown[];
  rest: string;
} {
  const events: unknown[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const dataLines = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) continue;

    const raw = dataLines.join("\n");
    if (!raw || raw === "[DONE]") continue;

    try {
      events.push(JSON.parse(raw));
    } catch {
      // Wait for a complete SSE frame.
    }
  }

  return { events, rest };
}

export async function streamChatQuestion(
  question: string,
  conversationId: string | null | undefined,
  onEvent: (event: ChatStreamEvent) => void,
  limit = 5,
): Promise<AskChatResponse["data"]> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  const response = await fetch(`${API_URL}/api/v1/chat/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      conversationId: conversationId || undefined,
      limit,
    }),
  });

  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) message = errorBody.message;
    } catch {
      // Keep the default message when the body is not JSON.
    }
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      throw new RateLimitError(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
        message,
      );
    }
    throw new ApiError(message, response.status);
  }

  if (!response.body) {
    throw new Error("Chat stream returned an empty body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneData: AskChatResponse["data"] | null = null;
  let streamError: string | null = null;

  const handleEvent = (event: ChatStreamEvent) => {
    onEvent(event);
    if (event.type === "done") {
      doneData = event.data;
    }
    if (event.type === "error") {
      streamError = event.message;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const consumed = consumeSseJsonEvents(buffer);
    buffer = consumed.rest;

    for (const event of consumed.events) {
      handleEvent(event as ChatStreamEvent);
    }
  }

  buffer += decoder.decode();
  const remaining = consumeSseJsonEvents(`${buffer}\n\n`);
  for (const event of remaining.events) {
    handleEvent(event as ChatStreamEvent);
  }

  if (streamError && !doneData) {
    throw new Error(streamError);
  }

  if (!doneData) {
    throw new Error("Chat stream ended without an answer.");
  }

  return doneData;
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

export function listAuditLogs(limit = 50) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListAuditLogsResponse>(
    `/api/v1/organizations/audit-logs?limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function listAiProviders() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<ListAiProvidersResponse>("/api/v1/organizations/ai-providers", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function upsertAiProvider(
  provider: AiLlmProvider,
  payload: { apiKey?: string; model?: string }
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpsertAiProviderResponse>(
    `/api/v1/organizations/ai-providers/${provider}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }
  );
}

export function setDefaultAiProvider(provider: AiLlmProvider) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<SetDefaultAiProviderResponse>(
    `/api/v1/organizations/ai-providers/${provider}/default`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function testAiProvider(provider: AiLlmProvider) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpsertAiProviderResponse>(
    `/api/v1/organizations/ai-providers/${provider}/test`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function deleteAiProvider(provider: AiLlmProvider) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<{ success: boolean; message: string }>(
    `/api/v1/organizations/ai-providers/${provider}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function listNotificationPreferences() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<NotificationPreferencesResponse>(
    "/api/v1/organizations/notification-preferences",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function updateNotificationPreferences(
  preferences: Array<{
    eventKey: string;
    emailEnabled: boolean;
    slackEnabled: boolean;
  }>
) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<NotificationPreferencesResponse>(
    "/api/v1/organizations/notification-preferences",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ preferences })
    }
  );
}

export function updateOrganizationPlan(plan: "FREE") {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpdateOrganizationResponse>("/api/v1/organizations/current/plan", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ plan })
  });
}

export function listTickets(params: ListTicketsParams = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.assigneeId) searchParams.set("assigneeId", params.assigneeId);
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();

  return request<ListTicketsResponse>(
    `/api/v1/tickets${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

export function getTicket(ticketId: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<GetTicketResponse>(`/api/v1/tickets/${ticketId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createTicket(payload: CreateTicketPayload) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<CreateTicketResponse>("/api/v1/tickets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateTicket(ticketId: string, payload: UpdateTicketPayload) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found.");
  }

  return request<UpdateTicketResponse>(`/api/v1/tickets/${ticketId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}
