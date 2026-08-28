import { describe, expect, it } from "vitest";
import { isLakeviewNationalReviewMatch, lakeviewNationalReviewLabel, parseLakeviewNationalReview } from "../shared/geosphereLakeview";

const reviewMatch = JSON.stringify({
  overlayEligibility: {
    lakeviewNational: {
      available: true,
      reviewReady: true,
      state: "WA",
      county: "King",
      defaultListingPriceCap: 1_249_125,
      priceWithinDefaultCap: true,
      property: { stickBuiltOneToFour: true, unitCount: 1, manufactured: false },
    },
  },
});

describe("GeoSphere Lakeview dashboard review parser", () => {
  it("accepts only the fully passed upstream Lakeview property review screen", () => {
    expect(isLakeviewNationalReviewMatch(reviewMatch)).toBe(true);
    expect(lakeviewNationalReviewLabel(parseLakeviewNationalReview(reviewMatch))).toContain("Lakeview review · WA · King County · 1-unit");
  });

  it("rejects unavailable, over-cap, manufactured, malformed, and non-review source data", () => {
    expect(isLakeviewNationalReviewMatch(JSON.stringify({ overlayEligibility: { lakeviewNational: { available: true, reviewReady: true, priceWithinDefaultCap: false, property: { stickBuiltOneToFour: true, manufactured: false } } } }))).toBe(false);
    expect(isLakeviewNationalReviewMatch(JSON.stringify({ overlayEligibility: { lakeviewNational: { available: true, reviewReady: true, priceWithinDefaultCap: true, property: { stickBuiltOneToFour: true, manufactured: true } } } }))).toBe(false);
    expect(isLakeviewNationalReviewMatch("not json")).toBe(false);
    expect(parseLakeviewNationalReview(JSON.stringify({ overlayEligibility: { lakeviewNational: { available: "true" } } }))).toMatchObject({ available: false, reviewReady: false });
  });
});
