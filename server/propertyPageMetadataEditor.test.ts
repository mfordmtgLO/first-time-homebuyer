import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/components/GeoSphereListings.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const publicPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/PropertyLandingPage.tsx"), "utf8");
const databaseSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

describe("single-property dashboard metadata editor", () => {
  it("accepts optional annual tax and unit inputs when a saved property page is created", () => {
    expect(workspaceSource).toContain('htmlFor="property-page-taxes"');
    expect(workspaceSource).toContain('htmlFor="property-page-units"');
    expect(workspaceSource).toContain("parseOptionalCurrencyAmount(propertyPageTaxes");
    expect(workspaceSource).toContain("units: propertyPageUnits.trim()");
    expect(routerSource).toContain("propertyTaxes: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable().optional()");
    expect(routerSource).toContain("units: z.string().trim().max(80).nullable().optional()");
  });

  it("keeps saved tax and unit details visible on the public property page", () => {
    expect(publicPageSource).toContain("snapshot.units ?? \"Not in saved snapshot\"");
    expect(publicPageSource).toContain("money(snapshot.propertyTaxes)");
  });

  it("supports optional HOA dues and post-creation edits for saved property facts", () => {
    expect(workspaceSource).toContain('htmlFor="property-page-hoa-dues"');
    expect(workspaceSource).toContain('htmlFor="property-page-homeowner-insurance"');
    expect(workspaceSource).toContain('htmlFor="property-page-mortgage-insurance"');
    expect(workspaceSource).toContain("parseOptionalCurrencyAmount(propertyPageHoaDues");
    expect(workspaceSource).toContain("Edit property facts");
    expect(workspaceSource).toContain("savePropertyPageFacts(page.id, metadataDraft)");
    expect(workspaceSource).toContain("Print all-in costs");
    expect(workspaceSource).toContain("printAllInMonthlyCostSummary");
    expect(routerSource).toContain("updateMetadata: protectedProcedure");
    expect(routerSource).toContain("hoaDues: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable()");
    expect(routerSource).toContain("homeownerInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable()");
    expect(routerSource).toContain("mortgageInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable()");
    expect(databaseSource).toContain("export async function updatePropertyLandingPageMetadata");
    expect(publicPageSource).toContain("snapshot.hoaDues === null");
    expect(publicPageSource).toContain("snapshot.homeownerInsurance === null");
    expect(workspaceSource).toContain("must be a non-negative dollar amount with no more than two decimal places");
  });

  it("keeps private compliance status and contribution limits available without turning them into public payment quotes", () => {
    expect(workspaceSource).toContain("Compliance review status");
    expect(workspaceSource).toContain("Maximum seller contribution");
    expect(workspaceSource).toContain("COMPLIANCE_STATUS_OPTIONS");
    expect(workspaceSource).toContain("FOR INTERNAL USE ONLY");
    expect(routerSource).toContain('complianceApprovalStatus: z.enum(["draft", "submitted", "approved", "changes_requested"])');
    expect(routerSource).toContain("maxSellerContribution: z.number().finite().min(0).max(1_000_000).multipleOf(0.01)");
    expect(databaseSource).toContain("complianceApprovalStatus: input.complianceApprovalStatus");
    expect(databaseSource).toContain("maxSellerContribution: input.maxSellerContribution");
    expect(publicPageSource).toContain("maxSellerContribution={snapshot.programContributionLimit ?? undefined}");
  });

  it("provides private FHA, VA, USDA, and conventional dual-cap settings using sales price rather than loan amount", () => {
    expect(workspaceSource).toContain("Program contribution limits");
    expect(workspaceSource).toContain("% sales price");
    expect(workspaceSource).toContain("percentage is calculated from sales price, never loan amount");
    expect(workspaceSource).toContain("Conventional occupancy");
    expect(workspaceSource).toContain("Conventional LTV tier");
    expect(workspaceSource).toContain("contributionProgram: draft.contributionProgram");
    expect(routerSource).toContain("programContributionLimit: z.number().finite().min(0).max(1_000_000).multipleOf(0.01)");
    expect(databaseSource).toContain("programContributionLimit: input.programContributionLimit");
  });
});
