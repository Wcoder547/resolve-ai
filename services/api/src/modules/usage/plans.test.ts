import { describe, expect, it } from "vitest";
import {
  getPlanDefinition,
  listPlanCatalog,
  PLAN_CATALOG,
} from "./plans.js";

describe("Organization plans (free product)", () => {
  it("exposes only FREE in the public catalog", () => {
    const catalog = listPlanCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.id).toBe("FREE");
    expect(catalog[0]?.priceUsd).toBe(0);
  });

  it("still resolves legacy PRO/TEAM limits for existing orgs", () => {
    expect(getPlanDefinition("PRO").dailyRequestLimit).toBe(
      PLAN_CATALOG.PRO.dailyRequestLimit,
    );
    expect(getPlanDefinition("TEAM").monthlyTokenLimit).toBe(
      PLAN_CATALOG.TEAM.monthlyTokenLimit,
    );
    expect(getPlanDefinition("unknown").id).toBe("FREE");
  });
});
