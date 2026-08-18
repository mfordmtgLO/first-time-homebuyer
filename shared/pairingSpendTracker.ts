export type PairingSpendAmounts = {
  loanOfficerCents: number;
  agentCents: number;
};

export type PairingSpendSummary = {
  loanOfficerCents: number;
  agentCents: number;
  totalCents: number;
  loanOfficerPercent: number;
  agentPercent: number;
  balanceStatus: "no_spend" | "balanced" | "attention";
};

/** Calculates a neutral internal allocation view; it is not a legal or compliance determination. */
export function calculatePairingSpendSummary(entries: PairingSpendAmounts[]): PairingSpendSummary {
  const loanOfficerCents = entries.reduce((sum, entry) => sum + Math.max(0, entry.loanOfficerCents), 0);
  const agentCents = entries.reduce((sum, entry) => sum + Math.max(0, entry.agentCents), 0);
  const totalCents = loanOfficerCents + agentCents;
  if (totalCents === 0) {
    return { loanOfficerCents, agentCents, totalCents, loanOfficerPercent: 50, agentPercent: 50, balanceStatus: "no_spend" };
  }
  const loanOfficerPercent = (loanOfficerCents / totalCents) * 100;
  const agentPercent = (agentCents / totalCents) * 100;
  return {
    loanOfficerCents,
    agentCents,
    totalCents,
    loanOfficerPercent,
    agentPercent,
    balanceStatus: loanOfficerPercent < 40 || loanOfficerPercent > 60 ? "attention" : "balanced",
  };
}

export function isMoneySplitAttentionRequired(summary: Pick<PairingSpendSummary, "balanceStatus">) {
  return summary.balanceStatus === "attention";
}
