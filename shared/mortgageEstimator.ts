import { monthlyPI } from "./buydown";

export type MortgageEstimateInputs = {
  purchasePrice: number;
  downPaymentPercent: number;
  annualRate: number;
  termYears: number;
};

export type MonthlyHousingEstimateInputs = MortgageEstimateInputs & {
  annualPropertyTax: number;
  annualHomeInsurance: number;
  monthlyHoaDues?: number;
  monthlyMortgageInsurance?: number;
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

export function estimateMonthlyHousingCost(inputs: MonthlyHousingEstimateInputs) {
  const mortgage = estimateMortgagePlanning(inputs);
  const monthlyPropertyTax = Math.max(inputs.annualPropertyTax, 0) / 12;
  const monthlyHomeInsurance = Math.max(inputs.annualHomeInsurance, 0) / 12;
  const monthlyHoaDues = Math.max(inputs.monthlyHoaDues ?? 0, 0);
  const monthlyMortgageInsurance = Math.max(inputs.monthlyMortgageInsurance ?? 0, 0);
  return {
    ...mortgage,
    monthlyPropertyTax,
    monthlyHomeInsurance,
    monthlyHoaDues,
    monthlyMortgageInsurance,
    estimatedTotalMonthlyPayment: mortgage.monthlyPayment + monthlyPropertyTax + monthlyHomeInsurance + monthlyHoaDues + monthlyMortgageInsurance,
  };
}
