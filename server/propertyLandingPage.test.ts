import { describe, expect, it } from "vitest";
import { buildPropertyLandingSnapshot, getPropertyHeroMedia, propertyEligibilityLabel, propertyFinancingContext } from "@shared/propertyLandingPage";
import { buildPropertyPageAgentDraft } from "@shared/propertyPageEmailDraft";

const snapshot = buildPropertyLandingSnapshot({
  id: 41,
  savedPullId: 9,
  address: "1024 S 5th St, Coos Bay, OR 97420",
  price: 440000,
  bedrooms: "3",
  bathrooms: "2",
  squareFootage: 1600,
  propertyType: "Single Family",
  latitude: "43.36",
  longitude: "-124.21",
  isLmi: 1,
  isUsda: 1,
    sourceData: JSON.stringify({
      description: "Saved listing description.",
      propertyTaxes: 3100,
      units: "2",
    mlsName: "Sample MLS",
    mlsNumber: "OR-12345",
    listingAgent: { name: "Taylor Agent", email: "taylor@example.com", phone: "541-555-0100" },
    photoUrls: ["https://images.example.com/home.jpg"],
  }),
}, "2026-08-16T00:00:00.000Z");

describe("single-property saved snapshots", () => {
  it("preserves imported property details and the dual-program screening label", () => {
    expect(snapshot.description).toBe("Saved listing description.");
    expect(snapshot.propertyTaxes).toBe(3100);
    expect(snapshot.units).toBe("2");
    expect(snapshot.photoUrls).toEqual(["https://images.example.com/home.jpg"]);
    expect(snapshot.listingAgent?.email).toBe("taylor@example.com");
    expect(propertyEligibilityLabel(snapshot)).toBe("OHCS Flex Lending or USDA RD potential");
    expect(propertyFinancingContext(snapshot)).toContain("OHCS Flex Lending or USDA RD");
    expect(propertyFinancingContext(snapshot)).toContain("subject to current program rules");
    expect(getPropertyHeroMedia(snapshot)).toEqual({ kind: "saved_listing_photo", url: "https://images.example.com/home.jpg" });
  });

  it("does not substitute external imagery when an authorized saved photo is absent", () => {
    expect(getPropertyHeroMedia({ photoUrls: [], latitude: 43.3665, longitude: -124.2179 })).toEqual({ kind: "unavailable" });
    expect(getPropertyHeroMedia({ photoUrls: [], latitude: null, longitude: null })).toEqual({ kind: "unavailable" });
  });

  it("adds the saved property URL, screening context, snapshot limitation, and signature to every agent draft", () => {
    const mailto = buildPropertyPageAgentDraft({
      templateBody: "I would welcome the chance to coordinate a first-time-buyer strategy.",
      propertyUrl: "https://firsttimehomebuyer.manus.space/property/1024-s-5th-st-coos-bay-or-97420",
      snapshot,
      listingAgentName: "Taylor Agent",
      listingAgentEmail: "taylor@example.com",
      loanOfficer: { name: "Mike Ford", email: "mike@example.com", phone: "541-729-0819", nmls: "288455", companyName: "Cornerstone First Mortgage" },
    });
    const draft = decodeURIComponent(mailto);
    expect(draft).toContain("Hi Taylor,");
    expect(draft).toContain("https://firsttimehomebuyer.manus.space/property/1024-s-5th-st-coos-bay-or-97420");
    expect(draft).toContain("OHCS Flex Lending or USDA RD potential");
    expect(draft).toContain("potential low- or no-down-payment first-time-buyer pathways");
    expect(draft).toContain("borrower, property, income, credit, and loan approval requirements");
    expect(draft).toContain("not a live listing feed");
    expect(draft).toContain("NMLS #288455");
  });
});
