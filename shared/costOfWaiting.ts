/**
 * Cost of Waiting (Rent vs. Buy) math — pure functions shared by the
 * calculator UI and tests.
 *
 * Compares two paths over a waiting period of 1–5 years:
 *  - RENT: keep renting at the current rent (money spent, zero equity).
 *  - BUY NOW: purchase today; wealth builds through (a) principal paydown on
 *    an amortizing loan and (b) home price appreciation, plus the initial
 *    down payment which converts cash into equity.
 *
 * "Cost of waiting" is presented as rent spent + equity forgone. Rent can
 * optionally compound annually via `rentIncreaseRate` (0–10%/yr). The model
 * stays deliberately simple and educational: no taxes, insurance,
 * maintenance, or selling costs. A disclaimer accompanies the UI.
 */

import { monthlyPI } from "./buydown";

export interface CostOfWaitingInputs {
  waitYears: number; // 1–5
  monthlyRent: number;
  purchasePrice: number;
  downPayment: number; // dollars (can be 0)
  interestRate: number; // annual %, e.g. 5.875–6.5
  appreciationRate: number; // annual %, 0–3
  rentIncreaseRate?: number; // annual %, 0–10; defaults to 0 (flat rent)
  termYears?: number; // defaults to 30
}

export interface YearPoint {
  year: number; // 1..waitYears
  cumulativeRent: number; // total rent paid through end of this year
  homeValue: number; // appreciated home value at end of this year
  loanBalance: number; // remaining principal at end of this year
  equity: number; // homeValue - loanBalance
  equityGained: number; // equity - downPayment (wealth built beyond initial cash)
}

export interface CostOfWaitingResult {
  loanAmount: number;
  monthlyPayment: number; // P&I at the chosen rate
  points: YearPoint[]; // one per year, 1..waitYears
  totalRentPaid: number; // over the full waiting period
  finalEquity: number; // total equity at end of period (incl. down payment)
  equityGained: number; // equity built beyond the initial down payment
  /** rent spent + equity forgone (beyond down payment) = headline cost of waiting */
  costOfWaiting: number;
}

/** Remaining balance on an amortizing loan after `monthsPaid` payments. */
export function remainingBalance(
  loanAmount: number,
  annualRatePct: number,
  monthsPaid: number,
  termYears = 30,
): number {
  if (loanAmount <= 0) return 0;
  const n = Math.round(termYears * 12);
  const m = Math.min(Math.max(monthsPaid, 0), n);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount * (1 - m / n);
  const factor = Math.pow(1 + r, n);
  const factorM = Math.pow(1 + r, m);
  const payment = (loanAmount * r * factor) / (factor - 1);
  const balance = loanAmount * factorM - (payment * (factorM - 1)) / r;
  return Math.max(balance, 0);
}

export function computeCostOfWaiting(inputs: CostOfWaitingInputs): CostOfWaitingResult {
  const termYears = inputs.termYears ?? 30;
  const waitYears = Math.min(Math.max(Math.round(inputs.waitYears), 1), 5);
  const monthlyRent = Math.max(inputs.monthlyRent, 0);
  const rentIncreaseRate = Math.min(Math.max(inputs.rentIncreaseRate ?? 0, 0), 10);
  const purchasePrice = Math.max(inputs.purchasePrice, 0);
  const downPayment = Math.min(Math.max(inputs.downPayment, 0), purchasePrice);
  const loanAmount = Math.max(purchasePrice - downPayment, 0);
  const monthlyPayment = monthlyPI(loanAmount, inputs.interestRate, termYears);

  const points: YearPoint[] = [];
  let cumulativeRent = 0;
  for (let year = 1; year <= waitYears; year++) {
    // Rent for this year: current rent compounded annually. Year 1 uses the
    // rent as entered; each following year rises by rentIncreaseRate.
    const rentThisYear = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, year - 1) * 12;
    cumulativeRent += rentThisYear;
    const homeValue = purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, year);
    const loanBalance = remainingBalance(loanAmount, inputs.interestRate, year * 12, termYears);
    const equity = homeValue - loanBalance;
    points.push({
      year,
      cumulativeRent,
      homeValue,
      loanBalance,
      equity,
      equityGained: equity - downPayment,
    });
  }

  const last = points[points.length - 1];
  return {
    loanAmount,
    monthlyPayment,
    points,
    totalRentPaid: last.cumulativeRent,
    finalEquity: last.equity,
    equityGained: last.equityGained,
    costOfWaiting: last.cumulativeRent + last.equityGained,
  };
}
