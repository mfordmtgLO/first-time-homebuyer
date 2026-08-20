import { describe, expect, it } from "vitest";
import { calculateEffectiveContributionScreeningLimit, calculateProgramContributionLimitAmount, DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS, getContributionScreeningFeedback, resolveProgramContributionLimitKeys } from "../shared/programContributionLimits";

describe("private program contribution screens", () => {
  it("calculates percentage caps from sales price rather than loan amount", () => {
    const amount = calculateProgramContributionLimitAmount({
      price: 500_000,
      program: "fha",
      conventionalOccupancy: "primary",
      conventionalLtvTier: "lte80",
      limits: { ...DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS, fha: { percentBps: 600, dollarCap: null } },
    });
    expect(amount).toBe(30_000);
  });

  it("uses the stricter configured dollar cap when one is present", () => {
    const limit = calculateEffectiveContributionScreeningLimit({
      price: 500_000,
      program: "usda",
      conventionalOccupancy: "primary",
      conventionalLtvTier: "lte80",
      limits: { ...DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS, usda: { percentBps: 600, dollarCap: 22_000 } },
    });
    expect(limit).toBe(22_000);
  });

  it("applies both conventional primary and selected LTV screens, using the lowest result", () => {
    const keys = resolveProgramContributionLimitKeys({ program: "conventional", conventionalOccupancy: "primary", conventionalLtvTier: "gt90" });
    expect(keys).toEqual(["conventional_primary", "conventional_gt90"]);
    const limit = calculateProgramContributionLimitAmount({
      price: 400_000,
      program: "conventional",
      conventionalOccupancy: "primary",
      conventionalLtvTier: "gt90",
      limits: { ...DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS, conventional_primary: { percentBps: 900, dollarCap: null }, conventional_gt90: { percentBps: 300, dollarCap: null } },
    });
    expect(limit).toBe(12_000);
  });

  it("does not add a conventional LTV tier to investment-property screens", () => {
    expect(resolveProgramContributionLimitKeys({ program: "conventional", conventionalOccupancy: "investment", conventionalLtvTier: "gt90" })).toEqual(["conventional_investment"]);
  });

  it("reports unconfigured, empty, within-limit, near-limit, and over-limit contribution states", () => {
    expect(getContributionScreeningFeedback({ contribution: 12_000, limit: null })).toMatchObject({ state: "unconfigured", limit: null, percentOfLimit: null });
    expect(getContributionScreeningFeedback({ contribution: "", limit: 12_000 })).toMatchObject({ state: "empty", remainingAmount: 12_000, percentOfLimit: 0 });
    expect(getContributionScreeningFeedback({ contribution: 6_000, limit: 12_000 })).toMatchObject({ state: "within", remainingAmount: 6_000, percentOfLimit: 50 });
    expect(getContributionScreeningFeedback({ contribution: 9_000, limit: 12_000 })).toMatchObject({ state: "near", remainingAmount: 3_000, percentOfLimit: 75 });
    expect(getContributionScreeningFeedback({ contribution: 12_350, limit: 12_000 })).toMatchObject({ state: "over", remainingAmount: 0, exceedanceAmount: 350, percentOfLimit: 102.92 });
  });
});
