import { describe, expect, it } from "vitest";
import { buildGeoSphereInventoryCsv, estimateExportMonthlyPrincipalAndInterest, estimateExportTotalMonthlyPayment, filterAndSortGeoSphereListings } from "../shared/geosphereInventory";

const listings = [
  { address: "500 Oak Street, Coos Bay, OR", price: 300000, bedrooms: 3, bathrooms: 2, squareFootage: 1600, propertyType: "Single family", propertyTaxes: 2400, units: "2", hoaDues: 125, homeownerInsurance: 145, isLmi: true, isUsda: true, lakeviewReview: true },
  { address: "12 Pine Avenue, Coos Bay, OR", price: 250000, bedrooms: 2, bathrooms: 1, squareFootage: 900, propertyType: "Condo", isLmi: false, isUsda: true },
];

describe("GeoSphere inventory helpers", () => {
  it("filters by address or property type and sorts the visible inventory", () => {
    expect(filterAndSortGeoSphereListings(listings, "condo", "address").map((listing) => listing.address)).toEqual(["12 Pine Avenue, Coos Bay, OR"]);
    expect(filterAndSortGeoSphereListings(listings, "", "price-high").map((listing) => listing.price)).toEqual([300000, 250000]);
  });

  it("exports the visible inventory with eligibility values", () => {
    const csv = buildGeoSphereInventoryCsv(listings);
    expect(csv).toContain("USDA RD eligible");
    expect(csv).toContain("Lakeview National review match");
    expect(csv).toContain("Property taxes (annual)");
    expect(csv).toContain("HOA dues (monthly)");
    expect(csv).toContain("Homeowner insurance (monthly)");
    expect(csv).toContain("Estimated total monthly payment");
    expect(csv).toContain("500 Oak Street, Coos Bay, OR");
    expect(csv).toContain("2400");
    expect(csv).toContain("125");
    expect(csv).toContain("145");
    expect(csv).toContain("Yes");
  });

  it("calculates export P&I and all-in monthly payment using documented static assumptions", () => {
    const principalAndInterest = estimateExportMonthlyPrincipalAndInterest(300000);
    expect(principalAndInterest).toBeGreaterThan(0);
    expect(estimateExportTotalMonthlyPayment(listings[0]!)).toBeCloseTo(principalAndInterest! + 200 + 125 + 145, 2);
  });
});
