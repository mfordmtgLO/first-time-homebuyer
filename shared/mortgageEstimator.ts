import { monthlyPI } from "./buydown";

export type MortgageEstimateInputs = {
  purchasePrice: number;
  downPaymentPercent: number;
  annualRate: number;
  termYears: number;
};

export function estimateMortgagePlanning(inputs: MortgageEstimateInputs) {
  const purchasePrice = Math.max(inputs.purchasePrice, 0);
  const downPaymentPercent = Math.min(Math.max(inputs.downPaymentPercent, 0), 100);
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = Math.max(purchasePrice - downPayment, 0);
  const monthlyPayment = monthlyPI(loanAmount, Math.max(inputs.annualRate, 0), inputs.termYears);
  const paymentCount = Math.max(inputs.termYears, 0) * 12;
  const totalOfPayments = monthlyPayment * paymentCount;
  return { downPayment, loanAmount, monthlyPayment, totalInterest: Math.max(totalOfPayments - loanAmount, 0), totalOfPayments };
}
