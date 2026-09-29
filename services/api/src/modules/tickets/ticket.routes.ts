import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireVerifiedEmail } from "../../middleware/email-verified.middleware.js";
import type { AuthenticatedRequest } from "../../types/express.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  createTicketController,
  getTicketController,
  listTicketsController,
  updateTicketController,
} from "./ticket.controller.js";

const router = Router();

type AuthenticatedRouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => unknown;

function authenticatedRoute(
  handler: AuthenticatedRouteHandler,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(
        handler(req as AuthenticatedRequest, res, next),
      ).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

router.use(requireAuth);
router.use(requireVerifiedEmail);

router.get(
  "/",
  requirePermission(PERMISSIONS.TICKET_READ),
  authenticatedRoute(listTicketsController),
);

router.get(
  "/:ticketId",
  requirePermission(PERMISSIONS.TICKET_READ),
  authenticatedRoute(getTicketController),
);

router.post(
  "/",
  requirePermission(PERMISSIONS.TICKET_CREATE),
  authenticatedRoute(createTicketController),
);

router.patch(
  "/:ticketId",
  requirePermission(PERMISSIONS.TICKET_UPDATE),
  authenticatedRoute(updateTicketController),
);

export default router;
