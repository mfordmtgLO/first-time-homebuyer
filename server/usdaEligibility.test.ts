import { describe, expect, it } from "vitest";
import { qualifiesForUsdaDashboardBadge } from "../shared/usdaEligibility";

describe("qualifiesForUsdaDashboardBadge", () => {
  const eligibleBase = {
    annualIncome: 123000,
    lowDownPaymentHomeSearch: 1,
    searchAreaType: "City",
    targetArea: "Coos Bay",
  };

  it("marks a city-request lead at or below the supplied income ceiling when the city is not excluded", () => {
    expect(qualifiesForUsdaDashboardBadge(eligibleBase)).toBe(true);
  });

  it("does not mark excluded cities, county searches, missing city responses, or income above the ceiling", () => {
    expect(qualifiesForUsdaDashboardBadge({ ...eligibleBase, targetArea: "Medford" })).toBe(false);
    expect(qualifiesForUsdaDashboardBadge({ ...eligibleBase, searchAreaType: "County" })).toBe(false);
    expect(qualifiesForUsdaDashboardBadge({ ...eligibleBase, targetArea: null })).toBe(false);
    expect(qualifiesForUsdaDashboardBadge({ ...eligibleBase, annualIncome: 123001 })).toBe(false);
  });
});
