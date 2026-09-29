export const ORGANIZATION_PLANS = ["FREE", "PRO", "TEAM"] as const;

export type OrganizationPlanId = (typeof ORGANIZATION_PLANS)[number];

export type OrganizationPlanDefinition = {
  id: OrganizationPlanId;
  label: string;
  priceUsd: number;
  description: string;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
};

export const PLAN_CATALOG: Record<OrganizationPlanId, OrganizationPlanDefinition> = {
  FREE: {
    id: "FREE",
    label: "Free",
    priceUsd: 0,
    description: "For evaluating ResolveAI with a small team.",
    dailyRequestLimit: 100,
    dailyTokenLimit: 100_000,
    monthlyTokenLimit: 1_000_000,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceUsd: 49,
    description: "Higher limits for active support and incident work.",
    dailyRequestLimit: 1_000,
    dailyTokenLimit: 1_000_000,
    monthlyTokenLimit: 10_000_000,
  },
  TEAM: {
    id: "TEAM",
    label: "Team",
    priceUsd: 149,
    description: "For larger workspaces with heavier AI usage.",
    dailyRequestLimit: 5_000,
    dailyTokenLimit: 5_000_000,
    monthlyTokenLimit: 50_000_000,
  },
};

export function isOrganizationPlanId(value: string): value is OrganizationPlanId {
  return ORGANIZATION_PLANS.includes(value as OrganizationPlanId);
}

export function getPlanDefinition(plan: string): OrganizationPlanDefinition {
  if (isOrganizationPlanId(plan)) {
    return PLAN_CATALOG[plan];
  }

  return PLAN_CATALOG.FREE;
}

export function listPlanCatalog() {
  return ORGANIZATION_PLANS.map((id) => PLAN_CATALOG[id]);
}
