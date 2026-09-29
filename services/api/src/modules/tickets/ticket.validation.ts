import { TicketPriority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const optionalEmail = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().email().max(320).nullable().optional(),
);

export const listTicketsQuerySchema = z.object({
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(TicketPriority).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional().nullable(),
  customerName: z.string().trim().max(200).optional().nullable(),
  customerEmail: optionalEmail,
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(TicketPriority).optional(),
  confidence: z.string().trim().max(50).optional().nullable(),
  summary: z.string().trim().max(10000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  agentRunId: z.string().uuid().optional().nullable(),
  conversationId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(10000).optional().nullable(),
    customerName: z.string().trim().max(200).optional().nullable(),
    customerEmail: optionalEmail,
    status: z.enum(TicketStatus).optional(),
    priority: z.enum(TicketPriority).optional(),
    confidence: z.string().trim().max(50).optional().nullable(),
    summary: z.string().trim().max(10000).optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine(
    (data) =>
      data.subject !== undefined ||
      data.description !== undefined ||
      data.customerName !== undefined ||
      data.customerEmail !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.confidence !== undefined ||
      data.summary !== undefined ||
      data.assigneeId !== undefined ||
      data.metadata !== undefined,
    { message: "Provide at least one field to update." },
  );

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
