import type { Response, Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { AuthenticatedRequest } from "../../types/express.js";
import { getOrganizationAiUsageSummary } from "./usage.service.js";

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    const error = new Error("No organization found for this user.");
    error.name = "NotFoundError";
    throw error;
  }

  return membership;
}

export async function getAiUsageSummaryController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const membership = await getPrimaryMembership(_req.user.id);

  const summary = await getOrganizationAiUsageSummary(
    membership.organizationId
  );

  return res.json({
    success: true,
    message: "AI usage summary fetched successfully.",
    data: summary
  });
}

export async function listAiUsageEventsController(
  _req: Request,
  res: Response
) {
    const req = _req as AuthenticatedRequest;
  const membership = await getPrimaryMembership(_req.user.id);

  const limit = Math.min(Number(_req.query.limit || 50), 100);

  const events = await prisma.aiUsageEvent.findMany({
    where: {
      organizationId: membership.organizationId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return res.json({
    success: true,
    message: "AI usage events fetched successfully.",
    data: {
      events
    }
  });
}