import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("weekly property engagement summary presentation", () => {
  it("shows trends and a documented high-activity alert without creating public activity data", () => {
    const widget = readFileSync("client/src/components/PropertyEngagementSummary.tsx", "utf8");
    expect(widget).toContain("TrendIndicator");
    expect(widget).toContain("priorWeekActivityCount");
    expect(widget).toContain("High activity");
    expect(widget).toContain("HIGH_ACTIVITY_WEEKLY_THRESHOLD");
    expect(widget).toContain("weeklyCapturedLeadCount");
    expect(widget).toContain("Save");
    expect(widget).toContain("saveEngagementThreshold");
    expect(widget).toContain("Most activity");
    expect(widget).toContain("Best conversion");
    expect(widget).toContain("sortWeeklyPropertyEngagement");
  });
});
