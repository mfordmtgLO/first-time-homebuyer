import { describe, expect, it } from "vitest";
import { getCoBrandAgentFilterOptions, getLoanOfficerFilterOptions, matchesSelectedCoBrandPair } from "../shared/roadmapPairFilters";

const leads = [
  { loanOfficerName: "Mike Ford", loanOfficerSlug: "mford", agentName: "Kaandice McLean", agentSlug: "kaandice-mclean", agentSource: "link" },
  { loanOfficerName: "Mike Ford", loanOfficerSlug: "mford", agentName: "Kaandice McLean", agentSlug: "kaandice-mclean", agentSource: "link" },
  { loanOfficerName: "Mike Ford", loanOfficerSlug: "mford", agentName: "Amy Adams", agentSlug: "amy-adams", agentSource: "link" },
  { loanOfficerName: "Zoe Grant", loanOfficerSlug: "zgrant", agentName: "Amy Adams", agentSlug: "amy-adams", agentSource: "link" },
  { loanOfficerName: "Mike Ford", loanOfficerSlug: "mford", agentName: "Manual Agent", agentSlug: "manual", agentSource: "manual" },
];

describe("Roadmap loan-officer and co-brand pairing filters", () => {
  it("lists historical loan officers alphabetically by first name", () => {
    expect(getLoanOfficerFilterOptions(leads).map((option) => option.label)).toEqual(["Mike Ford", "Zoe Grant"]);
  });

  it("lists only shared-link agents for the selected officer with the exact pair count", () => {
    expect(getCoBrandAgentFilterOptions(leads, "mford")).toEqual([
      { value: "amy-adams", label: "Amy Adams (1)", count: 1 },
      { value: "kaandice-mclean", label: "Kaandice McLean (2)", count: 2 },
    ]);
  });

  it("exports only shared-url leads when a specific LO-agent pairing is selected", () => {
    expect(leads.filter((lead) => matchesSelectedCoBrandPair(lead, "mford", "kaandice-mclean"))).toHaveLength(2);
  });
});
