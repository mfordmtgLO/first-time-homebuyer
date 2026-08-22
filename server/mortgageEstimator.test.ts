import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { estimateMortgagePlanning } from "@shared/mortgageEstimator";

describe("mortgage planning estimator", () => {
  it("calculates transparent principal-and-interest planning values from a price, down payment, rate, and term", () => {
    const estimate = estimateMortgagePlanning({ purchasePrice: 400000, downPaymentPercent: 20, annualRate: 6, termYears: 30 });

    expect(estimate.downPayment).toBe(80000);
    expect(estimate.loanAmount).toBe(320000);
    expect(estimate.monthlyPayment).toBeCloseTo(1918.56, 2);
    expect(estimate.totalInterest).toBeGreaterThan(0);
  });

  it("bounds a down payment to the purchase price and supports a zero-rate planning scenario", () => {
    const estimate = estimateMortgagePlanning({ purchasePrice: 120000, downPaymentPercent: 150, annualRate: 0, termYears: 30 });

    expect(estimate.downPayment).toBe(120000);
    expect(estimate.loanAmount).toBe(0);
    expect(estimate.monthlyPayment).toBe(0);
    expect(estimate.totalInterest).toBe(0);
  });

  it("keeps the display inside the private dashboard sidebar with an internal-use estimate notice", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");

    expect(componentSource).toContain("DashboardPaymentEstimator");
    expect(componentSource).toContain("Quick payment estimate");
    expect(componentSource).toContain("Monthly principal &amp; interest");
    expect(componentSource).toContain("Internal planning estimate only");
    expect(componentSource).toContain("Confirm pricing, fees, insurance, taxes, and final loan terms");
  });
});
