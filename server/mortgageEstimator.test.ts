import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { estimateMonthlyHousingCost, estimateMortgagePlanning } from "@shared/mortgageEstimator";

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

  it("adds annual property tax and homeowners insurance as monthly costs without changing the mortgage math", () => {
    const estimate = estimateMonthlyHousingCost({ purchasePrice: 400000, downPaymentPercent: 20, annualRate: 6, termYears: 30, annualPropertyTax: 4800, annualHomeInsurance: 1800 });

    expect(estimate.monthlyPropertyTax).toBe(400);
    expect(estimate.monthlyHomeInsurance).toBe(150);
    expect(estimate.estimatedTotalMonthlyPayment).toBeCloseTo(2468.56, 2);
  });

  it("includes monthly HOA dues and mortgage insurance in the all-in monthly total", () => {
    const estimate = estimateMonthlyHousingCost({ purchasePrice: 400000, downPaymentPercent: 20, annualRate: 6, termYears: 30, annualPropertyTax: 0, annualHomeInsurance: 0, monthlyHoaDues: 275, monthlyMortgageInsurance: 100 });

    expect(estimate.monthlyHoaDues).toBe(275);
    expect(estimate.monthlyMortgageInsurance).toBe(100);
    expect(estimate.estimatedTotalMonthlyPayment).toBeCloseTo(2293.56, 2);
  });

  it("keeps the display inside the private dashboard sidebar with an internal-use estimate notice", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");

    expect(componentSource).toContain("DashboardPaymentEstimator");
    expect(componentSource).toContain("Quick payment estimate");
    expect(componentSource).toContain("Estimated total monthly payment");
    expect(componentSource).toContain("Internal estimate annual property tax");
    expect(componentSource).toContain("Internal estimate annual home insurance");
    expect(componentSource).toContain("Estimated total monthly payment");
    expect(componentSource).toContain("Internal planning estimate only");
    expect(componentSource).toContain("confirm pricing, fees, and final loan terms");
  });
});
