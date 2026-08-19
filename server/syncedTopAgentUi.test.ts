import { describe, expect, it } from "vitest";
import { filterRankSnapshots, filterSyncedTopAgents, formatRankMovement, getSourcePoolTotal, getSyncedTopAgentSummary, summarizeOfficeRankMovements } from "@shared/syncedTopAgentUi";

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

  it("uses the declared source ranking pool rather than imported profile count", () => {
    expect(getSourcePoolTotal([
      { profileData: JSON.stringify({ rankTotal: 87 }) },
      { profileData: JSON.stringify({ rankTotal: 87 }) },
      { profileData: "not-json" },
    ])).toBe(87);
  });

  it("formats exact improved and dropped rank summaries", () => {
    expect(formatRankMovement(42, 35, 87)).toBe("improved: 42/87 → 35/87");
    expect(formatRankMovement(35, 42, 87)).toBe("dropped: 35/87 → 42/87");
  });

  it("filters private rank snapshots to the selected date range", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    const snapshots = [
      { capturedAt: new Date("2026-08-18T12:00:00.000Z") },
      { capturedAt: new Date("2026-07-30T12:00:00.000Z") },
      { capturedAt: new Date("2026-04-01T12:00:00.000Z") },
    ];
    expect(filterRankSnapshots(snapshots, "7d", now)).toEqual([snapshots[0]]);
    expect(filterRankSnapshots(snapshots, "30d", now)).toEqual([snapshots[0], snapshots[1]]);
    expect(filterRankSnapshots(snapshots, "all", now)).toEqual(snapshots);
  });

  it("summarizes rank movement at the office level", () => {
    expect(summarizeOfficeRankMovements([
      { fullName: "Avery", brokerage: "Cascadia", fromRank: 30, toRank: 20, rankTotal: 87 },
      { fullName: "Morgan", brokerage: "Cascadia", fromRank: 18, toRank: 22, rankTotal: 87 },
      { fullName: "Riley", brokerage: "Willamette", fromRank: 40, toRank: 32, rankTotal: 87 },
    ])).toEqual([
      { office: "Willamette", improved: 1, dropped: 0, netPositions: 8 },
      { office: "Cascadia", improved: 1, dropped: 1, netPositions: 6 },
    ]);
  });
});
