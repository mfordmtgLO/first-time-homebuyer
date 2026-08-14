export type RoadmapAttributionLead = {
  loanOfficerName: string | null;
  loanOfficerSlug: string | null;
  agentName: string | null;
  agentSlug: string | null;
  agentSource: string | null;
};

export type RoadmapFilterOption = { value: string; label: string };
export type RoadmapPairAgentOption = RoadmapFilterOption & { count: number };

export function loanOfficerFilterValue(lead: Pick<RoadmapAttributionLead, "loanOfficerSlug" | "loanOfficerName">) {
  return lead.loanOfficerSlug ?? lead.loanOfficerName ?? null;
}

export function agentFilterValue(lead: Pick<RoadmapAttributionLead, "agentSlug" | "agentName">) {
  return lead.agentSlug ?? lead.agentName ?? null;
}

function byFirstName<T extends { label: string }>(a: T, b: T) {
  const firstA = a.label.trim().split(/\s+/)[0] ?? "";
  const firstB = b.label.trim().split(/\s+/)[0] ?? "";
  return firstA.localeCompare(firstB, undefined, { sensitivity: "base" }) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

/** Lists loan officers present in Roadmap history, ordered by first name. */
export function getLoanOfficerFilterOptions(leads: RoadmapAttributionLead[]): RoadmapFilterOption[] {
  const unique = new Map<string, RoadmapFilterOption>();
  for (const lead of leads) {
    const value = loanOfficerFilterValue(lead);
    if (value && lead.loanOfficerName) unique.set(value, { value, label: lead.loanOfficerName });
  }
  return Array.from(unique.values()).sort(byFirstName);
}

/**
 * Lists only agents with historical shared-link Roadmap leads for one selected
 * officer. Counts intentionally exclude manual agent assignments.
 */
export function getCoBrandAgentFilterOptions(
  leads: RoadmapAttributionLead[],
  loanOfficerValue: string
): RoadmapPairAgentOption[] {
  if (loanOfficerValue === "all") return [];
  const grouped = new Map<string, { name: string; count: number }>();
  for (const lead of leads) {
    if (loanOfficerFilterValue(lead) !== loanOfficerValue || lead.agentSource !== "link" || !lead.agentName) continue;
    const value = agentFilterValue(lead);
    if (!value) continue;
    const current = grouped.get(value);
    grouped.set(value, { name: lead.agentName, count: (current?.count ?? 0) + 1 });
  }
  return Array.from(grouped.entries())
    .map(([value, { name, count }]) => ({ value, label: `${name} (${count})`, count }))
    .sort(byFirstName);
}

/** True only for a historical lead captured through the selected paired website. */
export function matchesSelectedCoBrandPair(lead: RoadmapAttributionLead, loanOfficerValue: string, agentValue: string) {
  return loanOfficerFilterValue(lead) === loanOfficerValue && agentFilterValue(lead) === agentValue && lead.agentSource === "link";
}
