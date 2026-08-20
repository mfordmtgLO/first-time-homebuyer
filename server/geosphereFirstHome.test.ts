import { describe, expect, it } from "vitest";
import { firstHomeScreeningLabel, isFirstHomeLmiPriceEligible, parseFirstHomeScreening } from "../shared/geosphereFirstHome";

const eligibleTargeted = JSON.stringify({
  overlayEligibility: {
    firstHome: {
      available: true,
      priceEligible: true,
      lmiEligible: true,
      areaType: "targeted",
      priceLimit: 541000,
      county: "Coos",
    },
  },
});

describe("GeoSphere FirstHome saved-snapshot screening", () => {
  it("recognizes the additive targeted-area LMI-plus-price metadata", () => {
    expect(isFirstHomeLmiPriceEligible(eligibleTargeted)).toBe(true);
    expect(firstHomeScreeningLabel(parseFirstHomeScreening(eligibleTargeted))).toBe("FirstHome targeted · max $541,000");
  });

  it("excludes unavailable, over-limit, and non-LMI listings from the strict FirstHome filter", () => {
    expect(isFirstHomeLmiPriceEligible(JSON.stringify({ overlayEligibility: { firstHome: { available: true, lmiEligible: true, priceEligible: false, priceLimit: 541000 } } }))).toBe(false);
    expect(isFirstHomeLmiPriceEligible(JSON.stringify({ overlayEligibility: { firstHome: { available: true, lmiEligible: false, priceEligible: true, priceLimit: 541000 } } }))).toBe(false);
    expect(isFirstHomeLmiPriceEligible("not-json")).toBe(false);
  });
});
