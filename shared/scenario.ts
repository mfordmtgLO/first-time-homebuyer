import { z } from "zod";

/**
 * Snapshot of a 2-1 buydown calculator run, attached to a Roadmap lead so the
 * advisor can follow up with the exact numbers the visitor explored.
 */
export const buydownScenarioSchema = z.object({
  purchasePrice: z.number().min(0).max(10_000_000),
  downPayment: z.number().min(0).max(10_000_000),
  noteRate: z.number().min(0).max(15),
  loanAmount: z.number().min(0).max(10_000_000),
  year1Payment: z.number().min(0),
  year2Payment: z.number().min(0),
  notePayment: z.number().min(0),
  year1MonthlySavings: z.number().min(0),
  year2MonthlySavings: z.number().min(0),
  totalSubsidy: z.number().min(0),
});

export type BuydownScenario = z.infer<typeof buydownScenarioSchema>;

/**
 * Snapshot of a Cost of Waiting (rent vs buy) calculator run, attached to a
 * Roadmap lead so the advisor can follow up with the exact numbers the visitor
 * explored.
 */
export const costOfWaitingScenarioSchema = z.object({
  waitYears: z.number().int().min(1).max(5),
  monthlyRent: z.number().min(0).max(50_000),
  purchasePrice: z.number().min(0).max(10_000_000),
  downPayment: z.number().min(0).max(10_000_000),
  interestRate: z.number().min(0).max(15),
  appreciationRate: z.number().min(0).max(10),
  /** Annual rent increase assumption, 0–10 %/yr. Optional for legacy rows. */
  rentIncreaseRate: z.number().min(0).max(10).optional(),
  monthlyPayment: z.number().min(0),
  totalRentPaid: z.number().min(0),
  equityGained: z.number().min(0),
  costOfWaiting: z.number().min(0),
});

export type CostOfWaitingScenario = z.infer<typeof costOfWaitingScenarioSchema>;

/**
 * Combined payload stored in the lead's `scenario` column. Either or both
 * calculators may be present depending on what the visitor attached.
 */
export const leadScenarioSchema = z.object({
  buydown: buydownScenarioSchema.optional(),
  costOfWaiting: costOfWaitingScenarioSchema.optional(),
});

export type LeadScenarioPayload = z.infer<typeof leadScenarioSchema>;
