import type { UserRole } from "@prisma/client";
import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  userId: string;
  email: string;
};

export type RequestOrganizationContext = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: RequestOrganizationContext;
    }
  }
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  organization?: RequestOrganizationContext;
};
