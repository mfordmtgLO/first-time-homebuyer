export const SELLER_CONTRIBUTION_PROGRAMS = ["none", "fha", "va", "usda", "conventional"] as const;
export type SellerContributionProgram = (typeof SELLER_CONTRIBUTION_PROGRAMS)[number];

export const CONVENTIONAL_OCCUPANCIES = ["primary", "second_home", "investment"] as const;
export type ConventionalOccupancy = (typeof CONVENTIONAL_OCCUPANCIES)[number];

export const CONVENTIONAL_LTV_TIERS = ["lte80", "ltv81_90", "gt90"] as const;
export type ConventionalLtvTier = (typeof CONVENTIONAL_LTV_TIERS)[number];

export const PROGRAM_CONTRIBUTION_LIMIT_KEYS = [
  "fha",
  "va",
  "usda",
  "conventional_primary",
  "conventional_second_home",
  "conventional_investment",
  "conventional_ltv81_90",
  "conventional_gt90",
] as const;
export type ProgramContributionLimitKey = (typeof PROGRAM_CONTRIBUTION_LIMIT_KEYS)[number];

export type ProgramContributionLimit = {
  /** Basis points of the saved property sales price, never loan amount. */
  percentBps: number;
  /** Optional fixed USD ceiling; when present, the stricter of both caps applies. */
  dollarCap: number | null;
};

export type ProgramContributionLimitValues = Record<ProgramContributionLimitKey, ProgramContributionLimit>;

export type ContributionScreeningFeedback = {
  state: "unconfigured" | "empty" | "within" | "near" | "over";
  enteredAmount: number | null;
  limit: number | null;
  remainingAmount: number | null;
  exceedanceAmount: number | null;
  percentOfLimit: number | null;
};

/**
 * Default percentages from the cited internal research note. They are editable
 * internal screens, not underwriting approvals or a substitute for current
 * program guidance and corporate compliance review.
 */
export const DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS: ProgramContributionLimitValues = {
  fha: { percentBps: 600, dollarCap: null },
  va: { percentBps: 400, dollarCap: null },
  usda: { percentBps: 600, dollarCap: null },
  conventional_primary: { percentBps: 900, dollarCap: null },
  conventional_second_home: { percentBps: 900, dollarCap: null },
  conventional_investment: { percentBps: 200, dollarCap: null },
  conventional_ltv81_90: { percentBps: 600, dollarCap: null },
  conventional_gt90: { percentBps: 300, dollarCap: null },
};

export const PROGRAM_CONTRIBUTION_LIMIT_LABELS: Record<ProgramContributionLimitKey, string> = {
  fha: "FHA",
  va: "VA seller concessions",
  usda: "USDA",
  conventional_primary: "Conventional · primary residence",
  conventional_second_home: "Conventional · second home",
  conventional_investment: "Conventional · investment property",
  conventional_ltv81_90: "Conventional · LTV 81–90%",
  conventional_gt90: "Conventional · LTV > 90%",
};

export function normalizeSellerContributionProgram(value: unknown): SellerContributionProgram {
  return typeof value === "string" && (SELLER_CONTRIBUTION_PROGRAMS as readonly string[]).includes(value)
    ? value as SellerContributionProgram
    : "none";
}

export function normalizeConventionalOccupancy(value: unknown): ConventionalOccupancy {
  return typeof value === "string" && (CONVENTIONAL_OCCUPANCIES as readonly string[]).includes(value)
    ? value as ConventionalOccupancy
    : "primary";
}

export function normalizeConventionalLtvTier(value: unknown): ConventionalLtvTier {
  return typeof value === "string" && (CONVENTIONAL_LTV_TIERS as readonly string[]).includes(value)
    ? value as ConventionalLtvTier
    : "lte80";
}

export function normalizeProgramContributionLimitValues(value: Partial<Record<ProgramContributionLimitKey, unknown>> | null | undefined): ProgramContributionLimitValues {
  return PROGRAM_CONTRIBUTION_LIMIT_KEYS.reduce((limits, key) => {
    const candidate = value?.[key] as Partial<ProgramContributionLimit> | undefined;
    const fallback = DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS[key];
    const percentBps = typeof candidate?.percentBps === "number" && Number.isInteger(candidate.percentBps) && candidate.percentBps >= 0 && candidate.percentBps <= 10_000
      ? candidate.percentBps
      : fallback.percentBps;
    const dollarCap = typeof candidate?.dollarCap === "number" && Number.isFinite(candidate.dollarCap) && candidate.dollarCap >= 0 && candidate.dollarCap <= 10_000_000
      ? Math.round(candidate.dollarCap * 100) / 100
      : null;
    limits[key] = { percentBps, dollarCap };
    return limits;
  }, {} as ProgramContributionLimitValues);
}

export function contributionLimitPercent(basisPoints: number) {
  return basisPoints / 100;
}

export function resolveProgramContributionLimitBasisPoints(input: {
  program: SellerContributionProgram;
  conventionalOccupancy: ConventionalOccupancy;
  conventionalLtvTier: ConventionalLtvTier;
  limits: ProgramContributionLimitValues;
}) {
  const keys = resolveProgramContributionLimitKeys(input);
  return keys.length ? Math.min(...keys.map((key) => input.limits[key].percentBps)) : null;
}

export function calculateProgramContributionLimitAmount(input: {
  price: number | null | undefined;
  program: SellerContributionProgram;
  conventionalOccupancy: ConventionalOccupancy;
  conventionalLtvTier: ConventionalLtvTier;
  limits: ProgramContributionLimitValues;
}) {
  if (!input.price || !Number.isFinite(input.price) || input.price <= 0) return null;
  const keys = resolveProgramContributionLimitKeys(input);
  if (!keys.length) return null;
  const limits = keys.map((key) => {
    const configured = input.limits[key];
    const salesPricePercentageAmount = input.price! * (configured.percentBps / 10_000);
    return configured.dollarCap === null ? salesPricePercentageAmount : Math.min(salesPricePercentageAmount, configured.dollarCap);
  });
  return Math.round(Math.min(...limits) * 100) / 100;
}

export function resolveProgramContributionLimitKeys(input: {
  program: SellerContributionProgram;
  conventionalOccupancy: ConventionalOccupancy;
  conventionalLtvTier: ConventionalLtvTier;
}): ProgramContributionLimitKey[] {
  if (input.program === "fha" || input.program === "va" || input.program === "usda") return [input.program];
  if (input.program !== "conventional") return [];
  const occupancyKey = input.conventionalOccupancy === "investment"
    ? "conventional_investment"
    : input.conventionalOccupancy === "second_home"
      ? "conventional_second_home"
      : "conventional_primary";
  if (input.conventionalOccupancy === "investment" || input.conventionalLtvTier === "lte80") return [occupancyKey];
  return [occupancyKey, input.conventionalLtvTier === "gt90" ? "conventional_gt90" : "conventional_ltv81_90"];
}

export function calculateEffectiveContributionScreeningLimit(input: {
  price: number | null | undefined;
  program: SellerContributionProgram;
  conventionalOccupancy: ConventionalOccupancy;
  conventionalLtvTier: ConventionalLtvTier;
  limits: ProgramContributionLimitValues;
  manualDollarCap?: number | null;
}) {
  const programAmount = calculateProgramContributionLimitAmount(input);
  const candidates = [programAmount, input.manualDollarCap ?? null].filter((value): value is number => value !== null && Number.isFinite(value));
  return candidates.length ? Math.min(...candidates) : null;
}

/**
 * Evaluates an entered seller contribution against an already-resolved private
 * program screen. The percentage is resolved from sales price before this step.
 */
export function getContributionScreeningFeedback(input: {
  contribution: number | string | null | undefined;
  limit: number | null | undefined;
}): ContributionScreeningFeedback {
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit >= 0
    ? Math.round(input.limit * 100) / 100
    : null;
  const rawContribution = typeof input.contribution === "string" ? input.contribution.trim() : input.contribution;
  const enteredAmount = rawContribution === "" || rawContribution === null || rawContribution === undefined
    ? null
    : Number(rawContribution);
  const validContribution = typeof enteredAmount === "number" && Number.isFinite(enteredAmount) && enteredAmount >= 0
    ? Math.round(enteredAmount * 100) / 100
    : null;

  if (limit === null) return { state: "unconfigured", enteredAmount: validContribution, limit: null, remainingAmount: null, exceedanceAmount: null, percentOfLimit: null };
  if (validContribution === null) return { state: "empty", enteredAmount: null, limit, remainingAmount: limit, exceedanceAmount: null, percentOfLimit: 0 };
  const difference = Math.round((limit - validContribution) * 100) / 100;
  const percentOfLimit = limit === 0 ? (validContribution === 0 ? 0 : 100) : Math.round((validContribution / limit) * 10_000) / 100;
  if (difference < 0) return { state: "over", enteredAmount: validContribution, limit, remainingAmount: 0, exceedanceAmount: Math.abs(difference), percentOfLimit };
  return {
    state: percentOfLimit >= 75 ? "near" : "within",
    enteredAmount: validContribution,
    limit,
    remainingAmount: difference,
    exceedanceAmount: null,
    percentOfLimit,
  };
}

export function programContributionSelectionLabel(input: {
  program: SellerContributionProgram;
  conventionalOccupancy: ConventionalOccupancy;
  conventionalLtvTier: ConventionalLtvTier;
}) {
  if (input.program === "fha") return "FHA";
  if (input.program === "va") return "VA seller concessions";
  if (input.program === "usda") return "USDA";
  if (input.program !== "conventional") return "No program screen selected";
  const occupancy = input.conventionalOccupancy === "second_home" ? "second home" : input.conventionalOccupancy;
  const tier = input.conventionalOccupancy === "investment" ? "" : input.conventionalLtvTier === "gt90" ? " · LTV > 90%" : input.conventionalLtvTier === "ltv81_90" ? " · LTV 81–90%" : " · LTV ≤ 80%";
  return `Conventional · ${occupancy}${tier}`;
}
