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

  it("keeps the public display explicit that it is a planning estimate rather than a loan quote", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/landing/MortgageEstimator.tsx"), "utf8");

    expect(componentSource).toContain("Principal and interest only");
    expect(componentSource).toContain("not a loan estimate, payment quote, rate lock, or commitment to lend");
    expect(componentSource).toContain("excludes taxes, insurance, HOA dues, mortgage insurance, lender fees, points, and APR");
  });
});
