/**
 * 2-1 Temporary Buydown math — pure functions shared by the calculator UI and tests.
 *
 * In a 2-1 buydown, the buyer's effective rate is reduced by 2% in year 1 and
 * 1% in year 2, then reverts to the full note rate from year 3 onward. The
 * seller (or builder) funds the difference up front as a concession held in
 * escrow — it is not a rate change on the loan itself.
 */

export interface BuydownInputs {
  purchasePrice: number;
  downPayment: number; // dollars
  noteRate: number; // annual percentage, e.g. 6.5
  termYears?: number; // defaults to 30
}

export interface BuydownResult {
  loanAmount: number;
  /** Monthly P&I at the full note rate (years 3-30). */
  notePayment: number;
  /** Monthly P&I at note rate − 2% (year 1). */
  year1Payment: number;
  /** Monthly P&I at note rate − 1% (year 2). */
  year2Payment: number;
  year1Rate: number;
  year2Rate: number;
  /** Monthly savings vs. note-rate payment. */
  year1MonthlySavings: number;
  year2MonthlySavings: number;
  year1AnnualSavings: number;
  year2AnnualSavings: number;
  /** Total seller-paid subsidy = year 1 + year 2 savings. */
  totalSubsidy: number;
}

/**
 * Standard amortized monthly principal & interest payment.
 * Returns 0 for non-positive loan amounts; handles 0% rate edge case.
 */
export function monthlyPI(loanAmount: number, annualRatePct: number, termYears = 30): number {
  if (loanAmount <= 0 || termYears <= 0) return 0;
  const n = Math.round(termYears * 12);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount / n;
  const factor = Math.pow(1 + r, n);
  return (loanAmount * r * factor) / (factor - 1);
}

export function computeBuydown(inputs: BuydownInputs): BuydownResult {
  const termYears = inputs.termYears ?? 30;
  const downPayment = Math.min(Math.max(inputs.downPayment, 0), inputs.purchasePrice);
  const loanAmount = Math.max(inputs.purchasePrice - downPayment, 0);

  const year1Rate = Math.max(inputs.noteRate - 2, 0);
  const year2Rate = Math.max(inputs.noteRate - 1, 0);

  const notePayment = monthlyPI(loanAmount, inputs.noteRate, termYears);
  const year1Payment = monthlyPI(loanAmount, year1Rate, termYears);
  const year2Payment = monthlyPI(loanAmount, year2Rate, termYears);

  const year1MonthlySavings = notePayment - year1Payment;
  const year2MonthlySavings = notePayment - year2Payment;
  const year1AnnualSavings = year1MonthlySavings * 12;
  const year2AnnualSavings = year2MonthlySavings * 12;

  return {
    loanAmount,
    notePayment,
    year1Payment,
    year2Payment,
    year1Rate,
    year2Rate,
    year1MonthlySavings,
    year2MonthlySavings,
    year1AnnualSavings,
    year2AnnualSavings,
    totalSubsidy: year1AnnualSavings + year2AnnualSavings,
  };
}
