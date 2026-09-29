export type TicketStatus =
  | "OPEN"
  | "PENDING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketUserRef = {
  id: string;
  name: string;
  email: string;
};

export type Ticket = {
  id: string;
  organizationId: string;
  subject: string;
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  confidence?: string | null;
  summary?: string | null;
  assigneeId?: string | null;
  createdByUserId?: string | null;
  agentRunId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown> | null;
  assignee?: TicketUserRef | null;
  createdBy?: TicketUserRef | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTicketsResponse = {
  success: boolean;
  message: string;
  data: {
    tickets: Ticket[];
  };
};

export type GetTicketResponse = {
  success: boolean;
  message: string;
  data: {
    ticket: Ticket;
  };
};

export type CreateTicketPayload = {
  subject: string;
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  confidence?: string | null;
  summary?: string | null;
  assigneeId?: string | null;
  agentRunId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateTicketPayload = {
  subject?: string;
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  confidence?: string | null;
  summary?: string | null;
  assigneeId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateTicketResponse = GetTicketResponse;
export type UpdateTicketResponse = GetTicketResponse;

export type ListTicketsParams = {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
  search?: string;
  limit?: number;
};
