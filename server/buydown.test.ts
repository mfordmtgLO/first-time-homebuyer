import { describe, expect, it } from "vitest";
import { computeBuydown, monthlyPI } from "../shared/buydown";

describe("monthlyPI", () => {
  it("computes standard 30-year amortized payment", () => {
    // $427,500 loan at 6.5% / 30yr ≈ $2,702.06
    expect(monthlyPI(427500, 6.5)).toBeCloseTo(2702.06, 1);
  });

  it("handles 0% rate as straight-line principal", () => {
    expect(monthlyPI(360000, 0)).toBeCloseTo(1000, 5);
  });

  it("returns 0 for non-positive loan amounts", () => {
    expect(monthlyPI(0, 6.5)).toBe(0);
    expect(monthlyPI(-100, 6.5)).toBe(0);
  });
});

describe("computeBuydown (2-1)", () => {
  const base = { purchasePrice: 450000, downPayment: 22500, noteRate: 6.5 };

  it("derives loan amount from price minus down payment", () => {
    expect(computeBuydown(base).loanAmount).toBe(427500);
  });

  it("uses note − 2% for year 1 and note − 1% for year 2", () => {
    const r = computeBuydown(base);
    expect(r.year1Rate).toBe(4.5);
    expect(r.year2Rate).toBe(5.5);
    expect(r.year1Payment).toBeCloseTo(monthlyPI(427500, 4.5), 6);
    expect(r.year2Payment).toBeCloseTo(monthlyPI(427500, 5.5), 6);
  });

  it("computes positive year-1 > year-2 savings and subsidy as their sum", () => {
    const r = computeBuydown(base);
    expect(r.year1MonthlySavings).toBeGreaterThan(r.year2MonthlySavings);
    expect(r.year2MonthlySavings).toBeGreaterThan(0);
    expect(r.totalSubsidy).toBeCloseTo(
      r.year1MonthlySavings * 12 + r.year2MonthlySavings * 12,
      6
    );
  });

  it("matches known values for 6.5% note on $427,500", () => {
    const r = computeBuydown(base);
    // 4.5% → ≈ $2,166.21/mo; 5.5% → ≈ $2,427.29/mo; 6.5% → ≈ $2,702.06/mo
    expect(r.year1MonthlySavings).toBeCloseTo(2702.06 - 2166.21, 0);
    expect(r.year2MonthlySavings).toBeCloseTo(2702.06 - 2427.29, 0);
  });

  it("supports 5.875% note rate (year 1 = 3.875%, year 2 = 4.875%)", () => {
    const r = computeBuydown({ ...base, noteRate: 5.875 });
    expect(r.year1Rate).toBe(3.875);
    expect(r.year2Rate).toBe(4.875);
    expect(r.year1MonthlySavings).toBeGreaterThan(0);
  });

  it("clamps down payment to purchase price and floors rates at 0", () => {
    const r = computeBuydown({ purchasePrice: 300000, downPayment: 400000, noteRate: 1.5 });
    expect(r.loanAmount).toBe(0);
    expect(r.notePayment).toBe(0);
    const r2 = computeBuydown({ purchasePrice: 300000, downPayment: 0, noteRate: 1.5 });
    expect(r2.year1Rate).toBe(0);
    expect(r2.year2Rate).toBe(0.5);
  });
});

