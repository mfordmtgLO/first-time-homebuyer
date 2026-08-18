import { describe, expect, it } from "vitest";
import { calculatePairingSpendSummary, isMoneySplitAttentionRequired } from "@shared/pairingSpendTracker";

describe("LO + agent pairing spend summary", () => {
  it("reports a balanced 50/50 allocation with column totals", () => {
    const summary = calculatePairingSpendSummary([
      { loanOfficerCents: 12500, agentCents: 12500 },
      { loanOfficerCents: 7500, agentCents: 7500 },
    ]);

    expect(summary).toMatchObject({ loanOfficerCents: 20000, agentCents: 20000, totalCents: 40000, loanOfficerPercent: 50, agentPercent: 50, balanceStatus: "balanced" });
    expect(isMoneySplitAttentionRequired(summary)).toBe(false);
  });

  it("flags allocations outside the internal 40%–60% review range", () => {
    const summary = calculatePairingSpendSummary([{ loanOfficerCents: 7000, agentCents: 3000 }]);

    expect(summary.loanOfficerPercent).toBe(70);
    expect(summary.agentPercent).toBe(30);
    expect(summary.balanceStatus).toBe("attention");
    expect(isMoneySplitAttentionRequired(summary)).toBe(true);
  });

  it("returns neutral percentages without an attention flag until any spend is recorded", () => {
    const summary = calculatePairingSpendSummary([]);

    expect(summary).toMatchObject({ totalCents: 0, loanOfficerPercent: 50, agentPercent: 50, balanceStatus: "no_spend" });
    expect(isMoneySplitAttentionRequired(summary)).toBe(false);
  });
});
