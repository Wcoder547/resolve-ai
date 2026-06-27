import type { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
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

export type AuthenticatedRequest = Express.Request & {
  user: AuthenticatedUser;
  organization?: RequestOrganizationContext;
};