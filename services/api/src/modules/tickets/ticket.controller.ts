import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
} from "./ticket.service.js";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "./ticket.validation.js";

function requireStringParam(
  value: string | string[] | undefined,
  paramName: string,
): string {
  if (typeof value !== "string") {
    const error = new Error(`Invalid or missing ${paramName}.`);
    error.name = "BadRequestError";
    throw error;
  }
  return value;
}

export async function listTicketsController(_req: Request, res: Response) {
  const req = _req as AuthenticatedRequest;
  const query = listTicketsQuerySchema.parse(req.query);
  const result = await listTickets(req.user.id, query);

  return res.json({
    success: true,
    message: "Tickets fetched successfully.",
    data: result,
  });
}

export async function getTicketController(_req: Request, res: Response) {
  const req = _req as AuthenticatedRequest;
  const ticketId = requireStringParam(req.params.ticketId, "ticketId");
  const result = await getTicketById(req.user.id, ticketId);

  return res.json({
    success: true,
    message: "Ticket fetched successfully.",
    data: result,
  });
}

export async function createTicketController(_req: Request, res: Response) {
  const req = _req as AuthenticatedRequest;
  const input = createTicketSchema.parse(req.body);
  const result = await createTicket(req.user.id, input);

  return res.status(201).json({
    success: true,
    message: "Ticket created successfully.",
    data: result,
  });
}

export async function updateTicketController(_req: Request, res: Response) {
  const req = _req as AuthenticatedRequest;
  const ticketId = requireStringParam(req.params.ticketId, "ticketId");
  const input = updateTicketSchema.parse(req.body);
  const result = await updateTicket(req.user.id, ticketId, input);

  return res.json({
    success: true,
    message: "Ticket updated successfully.",
    data: result,
  });
}
