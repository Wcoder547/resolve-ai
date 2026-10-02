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

/**
 * ResolveAI is a free product. PRO/TEAM remain in the catalog only so
 * legacy orgs with those plan strings still resolve limits correctly.
 * New workspaces stay on FREE; self-serve upgrades are disabled.
 */
export const PLAN_CATALOG: Record<OrganizationPlanId, OrganizationPlanDefinition> = {
  FREE: {
    id: "FREE",
    label: "Free",
    priceUsd: 0,
    description: "Full ResolveAI workspace — free for everyone.",
    dailyRequestLimit: 100,
    dailyTokenLimit: 100_000,
    monthlyTokenLimit: 1_000_000,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceUsd: 0,
    description: "Legacy higher limits (not offered for new upgrades).",
    dailyRequestLimit: 1_000,
    dailyTokenLimit: 1_000_000,
    monthlyTokenLimit: 10_000_000,
  },
  TEAM: {
    id: "TEAM",
    label: "Team",
    priceUsd: 0,
    description: "Legacy higher limits (not offered for new upgrades).",
    dailyRequestLimit: 5_000,
    dailyTokenLimit: 5_000_000,
    monthlyTokenLimit: 50_000_000,
  },
};

export const PUBLIC_PLAN_IDS: OrganizationPlanId[] = ["FREE"];

export function isOrganizationPlanId(value: string): value is OrganizationPlanId {
  return ORGANIZATION_PLANS.includes(value as OrganizationPlanId);
}

export function getPlanDefinition(plan: string): OrganizationPlanDefinition {
  if (isOrganizationPlanId(plan)) {
    return PLAN_CATALOG[plan];
  }

  return PLAN_CATALOG.FREE;
}

/** Plans shown in Settings / usage summary — free product only. */
export function listPlanCatalog() {
  return PUBLIC_PLAN_IDS.map((id) => PLAN_CATALOG[id]);
}
