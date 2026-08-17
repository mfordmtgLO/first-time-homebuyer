export type RoadmapCohort = "buydown" | "costOfWaiting" | "both" | "noCalculator";

export function roadmapCohort(raw: string | null): RoadmapCohort {
  if (!raw) return "noCalculator";
  try {
    const scenario = JSON.parse(raw) as { buydown?: unknown; costOfWaiting?: unknown };
    const hasBuydown = Boolean(scenario?.buydown) || (typeof scenario === "object" && scenario !== null && "purchasePrice" in scenario);
    const hasCostOfWaiting = Boolean(scenario?.costOfWaiting);
    if (hasBuydown && hasCostOfWaiting) return "both";
    if (hasBuydown) return "buydown";
    if (hasCostOfWaiting) return "costOfWaiting";
  } catch {
    // Treat malformed legacy payloads as no measured calculator cohort.
  }
  return "noCalculator";
}
