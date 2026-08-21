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
    expect(routerSource).toContain('complianceApprovalStatus: z.enum(["draft", "submitted", "approved", "changes_requested", "needs_review"])');
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

  it("keeps the single-property creation editor contained, scrollable, and responsive", () => {
    expect(workspaceSource).toContain('className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"');
    expect(workspaceSource).toContain('className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-6 py-5"');
    expect(workspaceSource).toContain('grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3');
    expect(workspaceSource).toContain('className="min-w-0 space-y-1.5"');
    expect(workspaceSource).toContain('className="break-words text-xs leading-5 text-muted-foreground"');
    expect(workspaceSource).toContain('className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background px-6 py-4 sm:flex-row sm:justify-end"');
  });

  it("compacts co-branded property pages into a vertical card rail with one selected full workspace", () => {
    expect(workspaceSource).toContain("selectedPropertyPageId");
    expect(workspaceSource).toContain("Property cards");
    expect(workspaceSource).toContain("Open full workspace");
    expect(workspaceSource).toContain("Full property workspace");
    expect(workspaceSource).toContain("Back to cards");
    expect(workspaceSource).toContain("xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]");
    expect(workspaceSource).toContain("overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]");
    expect(workspaceSource).toContain("propertyPages.filter((page) => page.id === selectedPropertyPageId)");
  });

  it("automatically changes an over-limit contribution to Needs Review and shows the exact screening feedback", () => {
    expect(workspaceSource).toContain('value: "needs_review", label: "Needs review · contribution over limit"');
    expect(workspaceSource).toContain("getContributionScreeningFeedback");
    expect(workspaceSource).toContain('complianceApprovalStatus = contributionFeedback.state === "over" ? "needs_review"');
    expect(workspaceSource).toContain("Exceeds the stricter configured cap by");
    expect(workspaceSource).toContain("Near private limit");
    expect(workspaceSource).toContain("transition-[width]");
    expect(databaseSource).toContain("contributionExceedsScreen");
    expect(databaseSource).toContain('contributionExceedsScreen ? "needs_review" as const');
  });
});
