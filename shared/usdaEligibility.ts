/**
 * A dashboard screening indicator based solely on the criteria supplied by
 * the business owner. It is not a USDA loan or property-eligibility decision.
 */
export const USDA_INELIGIBLE_CITIES = new Set([
  "medford", "eugene", "springfield", "albany", "salem", "portland", "clackamas",
  "beaverton", "corvallis", "keizer", "bend", "wilsonville", "tigard", "lake oswego",
  "oregon city", "west linn", "happy valley", "gresham", "hillsboro", "milwaukie",
]);

type UsdaChatCandidate = {
  annualIncome: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
};

function normalizedCity(value: string) {
  return value.trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
}

export function qualifiesForUsdaDashboardBadge(lead: UsdaChatCandidate) {
  const city = lead.targetArea?.trim() ?? "";
  return lead.annualIncome !== null
    && lead.annualIncome <= 123_000
    && lead.lowDownPaymentHomeSearch === 1
    && lead.searchAreaType?.trim().toLowerCase() === "city"
    && Boolean(city)
    && !USDA_INELIGIBLE_CITIES.has(normalizedCity(city));
}
