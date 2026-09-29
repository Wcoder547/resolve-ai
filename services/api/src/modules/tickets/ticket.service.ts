import { Prisma, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "./ticket.validation.js";

function createAppError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw createAppError(
      "NotFoundError",
      "No organization found for this user.",
    );
  }

  return membership;
}

const ticketInclude = {
  assignee: {
    select: { id: true, name: true, email: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

function normalizeEmail(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return value;
}

export async function listTickets(userId: string, query: ListTicketsQuery) {
  const membership = await getPrimaryMembership(userId);

  const where: Prisma.TicketWhereInput = {
    organizationId: membership.organizationId,
  };

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assigneeId) where.assigneeId = query.assigneeId;

  if (query.search) {
    where.OR = [
      { subject: { contains: query.search, mode: "insensitive" } },
      { customerName: { contains: query.search, mode: "insensitive" } },
      { customerEmail: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: ticketInclude,
    orderBy: { updatedAt: "desc" },
    take: query.limit,
  });

  return { tickets };
}

export async function getTicketById(userId: string, ticketId: string) {
  const membership = await getPrimaryMembership(userId);

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      organizationId: membership.organizationId,
    },
    include: ticketInclude,
  });

  if (!ticket) {
    throw createAppError("NotFoundError", "Ticket not found.");
  }

  return { ticket };
}

export async function createTicket(userId: string, input: CreateTicketInput) {
  const membership = await getPrimaryMembership(userId);

  if (input.assigneeId) {
    const assigneeMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: input.assigneeId,
        organizationId: membership.organizationId,
      },
    });

    if (!assigneeMembership) {
      throw createAppError(
        "BadRequestError",
        "Assignee must be a member of this organization.",
      );
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: membership.organizationId,
      subject: input.subject,
      description: input.description ?? null,
      customerName: input.customerName ?? null,
      customerEmail: normalizeEmail(input.customerEmail),
      status: input.status ?? TicketStatus.OPEN,
      priority: input.priority ?? TicketPriority.MEDIUM,
      confidence: input.confidence ?? null,
      summary: input.summary ?? null,
      assigneeId: input.assigneeId ?? null,
      createdByUserId: userId,
      agentRunId: input.agentRunId ?? null,
      conversationId: input.conversationId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    include: ticketInclude,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      organizationId: membership.organizationId,
      action: "TICKET_CREATED",
      metadata: {
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
      },
    },
  });

  return { ticket };
}

export async function updateTicket(
  userId: string,
  ticketId: string,
  input: UpdateTicketInput,
) {
  const membership = await getPrimaryMembership(userId);

  const existing = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    throw createAppError("NotFoundError", "Ticket not found.");
  }

  if (input.assigneeId) {
    const assigneeMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: input.assigneeId,
        organizationId: membership.organizationId,
      },
    });

    if (!assigneeMembership) {
      throw createAppError(
        "BadRequestError",
        "Assignee must be a member of this organization.",
      );
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.customerName !== undefined
        ? { customerName: input.customerName }
        : {}),
      ...(input.customerEmail !== undefined
        ? { customerEmail: normalizeEmail(input.customerEmail) }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.confidence !== undefined
        ? { confidence: input.confidence }
        : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.assigneeId !== undefined
        ? { assigneeId: input.assigneeId }
        : {}),
      ...(input.metadata !== undefined
        ? {
            metadata: input.metadata as Prisma.InputJsonValue,
          }
        : {}),
    },
    include: ticketInclude,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      organizationId: membership.organizationId,
      action: "TICKET_UPDATED",
      metadata: {
        ticketId: ticket.id,
        changes: input as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    },
  });

  return { ticket };
}

/** Used by agent tool approval — creates a ticket row without HTTP auth context. */
export async function createTicketFromAgentTool(input: {
  organizationId: string;
  createdByUserId: string;
  subject: string;
  description?: string | null;
  summary?: string | null;
  priority?: TicketPriority;
  confidence?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  agentRunId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const ticket = await prisma.ticket.create({
    data: {
      organizationId: input.organizationId,
      subject: input.subject,
      description: input.description ?? null,
      summary: input.summary ?? null,
      priority: input.priority ?? TicketPriority.MEDIUM,
      confidence: input.confidence ?? null,
      customerName: input.customerName ?? null,
      customerEmail: normalizeEmail(input.customerEmail),
      status: TicketStatus.OPEN,
      createdByUserId: input.createdByUserId,
      agentRunId: input.agentRunId ?? null,
      conversationId: input.conversationId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    include: ticketInclude,
  });

  await prisma.auditLog.create({
    data: {
      userId: input.createdByUserId,
      organizationId: input.organizationId,
      action: "TICKET_CREATED_FROM_AGENT",
      metadata: {
        ticketId: ticket.id,
        agentRunId: input.agentRunId ?? null,
        subject: ticket.subject,
      },
    },
  });

  return ticket;
}
