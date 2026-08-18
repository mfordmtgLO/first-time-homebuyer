import { describe, expect, it } from "vitest";
import { filterSyncedTopAgents, getSyncedTopAgentSummary } from "@shared/syncedTopAgentUi";

const profiles = [
  { fullName: "Avery Brooks", brokerage: "Cascadia Realty", cityArea: "Salem", syncedAt: new Date("2026-08-18T10:00:00.000Z") },
  { fullName: "Morgan Lee", brokerage: "Willamette Homes", cityArea: "Eugene", syncedAt: new Date("2026-08-18T11:30:00.000Z") },
];

describe("synced top agent UI helpers", () => {
  it("filters profiles by name, brokerage, or service area", () => {
    expect(filterSyncedTopAgents(profiles, "morgan")).toEqual([profiles[1]]);
    expect(filterSyncedTopAgents(profiles, "cascadia")).toEqual([profiles[0]]);
    expect(filterSyncedTopAgents(profiles, "eugene")).toEqual([profiles[1]]);
  });

  it("reports imported count and most recent sync timestamp", () => {
    expect(getSyncedTopAgentSummary(profiles)).toEqual({ count: 2, latestSyncedAt: profiles[1].syncedAt });
  });
});
