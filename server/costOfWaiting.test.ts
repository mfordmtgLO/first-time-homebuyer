import { describe, expect, it } from "vitest";
import { computeCostOfWaiting, remainingBalance } from "../shared/costOfWaiting";
import { monthlyPI } from "../shared/buydown";

describe("remainingBalance", () => {
  it("returns full principal at 0 months and 0 at term end", () => {
    expect(remainingBalance(400000, 6.5, 0)).toBeCloseTo(400000, 2);
    expect(remainingBalance(400000, 6.5, 360)).toBeCloseTo(0, 2);
  });

  it("declines monotonically over time", () => {
    const b12 = remainingBalance(400000, 6.5, 12);
    const b24 = remainingBalance(400000, 6.5, 24);
    const b60 = remainingBalance(400000, 6.5, 60);
    expect(b12).toBeLessThan(400000);
    expect(b24).toBeLessThan(b12);
    expect(b60).toBeLessThan(b24);
  });

  it("handles 0% rate as linear paydown", () => {
    expect(remainingBalance(360000, 0, 12, 30)).toBeCloseTo(360000 * (1 - 12 / 360), 2);
  });

  it("matches amortization identity: balance after 12 payments equals principal grown minus payments applied", () => {
    // Cross-check against a manual month-by-month amortization loop.
    const loan = 400000;
    const rate = 6.5;
    const pay = monthlyPI(loan, rate, 30);
    let bal = loan;
    for (let i = 0; i < 12; i++) bal = bal * (1 + rate / 100 / 12) - pay;
    expect(remainingBalance(loan, rate, 12)).toBeCloseTo(bal, 4);
  });
});

describe("computeCostOfWaiting", () => {
  const base = {
    waitYears: 3,
    monthlyRent: 1800,
    purchasePrice: 400000,
    downPayment: 0,
    interestRate: 6.5,
    appreciationRate: 2,
  };

  it("computes rent totals as rent * 12 * years", () => {
    const r = computeCostOfWaiting(base);
    expect(r.totalRentPaid).toBeCloseTo(1800 * 12 * 3, 2);
    expect(r.points).toHaveLength(3);
    expect(r.points[0].cumulativeRent).toBeCloseTo(1800 * 12, 2);
  });

  it("builds equity from appreciation plus principal paydown with zero down", () => {
    const r = computeCostOfWaiting(base);
    const p1 = r.points[0];
    expect(p1.homeValue).toBeCloseTo(400000 * 1.02, 2);
    expect(p1.loanBalance).toBeLessThan(400000);
    expect(p1.equity).toBeCloseTo(p1.homeValue - p1.loanBalance, 6);
    // zero down: equityGained === equity
    expect(p1.equityGained).toBeCloseTo(p1.equity, 6);
    expect(r.equityGained).toBeGreaterThan(0);
  });

  it("cost of waiting = rent paid + equity gained beyond down payment", () => {
    const r = computeCostOfWaiting(base);
    expect(r.costOfWaiting).toBeCloseTo(r.totalRentPaid + r.equityGained, 6);
  });

  it("excludes the down payment itself from equity gained", () => {
    const withDown = computeCostOfWaiting({ ...base, downPayment: 40000 });
    const last = withDown.points[withDown.points.length - 1];
    expect(last.equity).toBeCloseTo(last.homeValue - last.loanBalance, 6);
    expect(withDown.equityGained).toBeCloseTo(last.equity - 40000, 6);
  });

  it("clamps waiting years to 1-5", () => {
    expect(computeCostOfWaiting({ ...base, waitYears: 0 }).points).toHaveLength(1);
    expect(computeCostOfWaiting({ ...base, waitYears: 9 }).points).toHaveLength(5);
  });

  it("zero appreciation still builds equity via principal paydown", () => {
    const r = computeCostOfWaiting({ ...base, appreciationRate: 0 });
    expect(r.equityGained).toBeGreaterThan(0);
    expect(r.points[2].homeValue).toBeCloseTo(400000, 2);
  });

  it("rent growth of 0% (or omitted) keeps flat-rent totals — backward compatible", () => {
    const flat = computeCostOfWaiting(base);
    const explicitZero = computeCostOfWaiting({ ...base, rentIncreaseRate: 0 });
    expect(explicitZero.totalRentPaid).toBeCloseTo(flat.totalRentPaid, 6);
    expect(explicitZero.costOfWaiting).toBeCloseTo(flat.costOfWaiting, 6);
  });

  it("compounds rent annually at the rent increase rate", () => {
    // 3 years at $1,000/mo with 10%/yr growth:
    // Y1 = 12,000; Y2 = 13,200; Y3 = 14,520 → cumulative 12,000 / 25,200 / 39,720
    const r = computeCostOfWaiting({
      ...base,
      monthlyRent: 1000,
      waitYears: 3,
      rentIncreaseRate: 10,
    });
    expect(r.points[0].cumulativeRent).toBeCloseTo(12000, 0);
    expect(r.points[1].cumulativeRent).toBeCloseTo(25200, 0);
    expect(r.points[2].cumulativeRent).toBeCloseTo(39720, 0);
    expect(r.totalRentPaid).toBeCloseTo(39720, 0);
  });

  it("clamps rent increase rate to the 0-10 range", () => {
    const capped = computeCostOfWaiting({ ...base, rentIncreaseRate: 50 });
    const atMax = computeCostOfWaiting({ ...base, rentIncreaseRate: 10 });
    expect(capped.totalRentPaid).toBeCloseTo(atMax.totalRentPaid, 6);
    const negative = computeCostOfWaiting({ ...base, rentIncreaseRate: -5 });
    const atMin = computeCostOfWaiting({ ...base, rentIncreaseRate: 0 });
    expect(negative.totalRentPaid).toBeCloseTo(atMin.totalRentPaid, 6);
  });

  it("uses boundary rates 5.875 and 6.5 correctly (lower rate pays down more principal)", () => {
    const low = computeCostOfWaiting({ ...base, interestRate: 5.875 });
    const high = computeCostOfWaiting({ ...base, interestRate: 6.5 });
    expect(low.monthlyPayment).toBeLessThan(high.monthlyPayment);
    expect(low.points[2].loanBalance).toBeLessThan(high.points[2].loanBalance);
    expect(low.equityGained).toBeGreaterThan(high.equityGained);
  });
});
